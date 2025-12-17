import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VIOLATION_THRESHOLD } from '@/types/quiz';

interface UseProctoringOptions {
  playerId: string | null;
  isActive: boolean;
  onDisqualified?: () => void;
}

export function useProctoring({ playerId, isActive, onDisqualified }: UseProctoringOptions) {
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const violationCountRef = useRef(0);
  const analysisIntervalRef = useRef<number | null>(null);
  const cameraMonitorIntervalRef = useRef<number | null>(null);
  const lastViolationTsRef = useRef<Record<string, number>>({});
  const PENALTY_PER_WARNING = 10;

  const logViolation = useCallback(async (type: string, details?: string) => {
    if (!playerId || !isActive) return;

    // debounce same violation type within a longer window (60s)
    const now = Date.now();
    const lastTs = lastViolationTsRef.current[type] || 0;
    if (now - lastTs < 60000) return; // ignore duplicates within 60s
    lastViolationTsRef.current[type] = now;

    try {
      await supabase.from('violations').insert({
        player_id: playerId,
        violation_type: type,
        details: details || null,
      });

      violationCountRef.current += 1;
      setViolationCount(violationCountRef.current);

      // Deduct penalty from player's total score
      try {
        const { data: playerData } = await supabase
          .from('players')
          .select('total_score')
          .eq('id', playerId)
          .single();

        const currentScore = playerData?.total_score ?? 0;
        const newScore = Math.max(0, currentScore - PENALTY_PER_WARNING);
        await supabase.from('players').update({ total_score: newScore }).eq('id', playerId);
      } catch (err) {
        console.error('Failed to apply penalty:', err);
      }

      // Show warning
      setWarningMessage(getWarningMessage(type, violationCountRef.current));
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);

      // Check for disqualification
      if (violationCountRef.current >= VIOLATION_THRESHOLD) {
        await supabase.from('players').update({
          is_disqualified: true,
          disqualification_reason: `Exceeded ${VIOLATION_THRESHOLD} proctoring violations`,
        }).eq('id', playerId);
        onDisqualified?.();
      }
    } catch (error) {
      console.error('Error logging violation:', error);
    }
  }, [playerId, isActive, onDisqualified]);

  // Tab visibility detection
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab_switch', 'User switched to another tab');
      }
    };

    const handleBlur = () => {
      logViolation('tab_switch', 'Window lost focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, logViolation]);

  // Fullscreen enforcement
  useEffect(() => {
    if (!isActive) return;

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      if (!isNowFullscreen && isActive) {
        logViolation('fullscreen_exit', 'User exited fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isActive, logViolation]);

  // Camera check
  useEffect(() => {
    if (!isActive || !playerId) return;

    const checkCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setCameraActive(true);

        // Update player camera status
        await supabase.from('players').update({ camera_active: true }).eq('id', playerId);

        // Check if camera gets disabled
        stream.getVideoTracks().forEach(track => {
          track.onended = () => {
            setCameraActive(false);
            logViolation('camera_off', 'Camera was disabled');
            supabase.from('players').update({ camera_active: false }).eq('id', playerId);
          };
        });

        // Start a short interval to monitor camera track enabled state (covers some browsers)
        if (!cameraMonitorIntervalRef.current) {
          cameraMonitorIntervalRef.current = window.setInterval(() => {
            try {
              const tracks = streamRef.current?.getVideoTracks() || [];
              if (tracks.length === 0) {
                // no tracks -> camera not available
                if (cameraActive) {
                  setCameraActive(false);
                  logViolation('camera_off', 'No camera tracks');
                  supabase.from('players').update({ camera_active: false }).eq('id', playerId);
                }
              } else {
                const enabled = tracks.some(t => t.enabled && t.readyState === 'live');
                if (!enabled) {
                  if (cameraActive) {
                    setCameraActive(false);
                    logViolation('camera_off', 'Camera track disabled');
                    supabase.from('players').update({ camera_active: false }).eq('id', playerId);
                  }
                } else {
                  if (!cameraActive) {
                    setCameraActive(true);
                    supabase.from('players').update({ camera_active: true }).eq('id', playerId);
                  }
                }
              }
            } catch (err) {
              console.error('camera monitor error', err);
            }
          }, 1000) as unknown as number;
        }

        // Start lightweight AI analysis interval (heuristic)
        if (!analysisIntervalRef.current) {
          // run AI heuristic less frequently to reduce false positives
          analysisIntervalRef.current = window.setInterval(async () => {
            try {
              const suspicious = await analyzeVideoStreamForSuspiciousBehavior(stream);
              if (suspicious) {
                logViolation('suspicious_activity', 'AI detected suspicious behavior');
              }
            } catch (err) {
              console.error('AI analysis error:', err);
            }
          }, 10000);
        }
      } catch (error) {
        console.error('Camera access denied:', error);
        setCameraActive(false);
      }
    };

    checkCamera();

    // Initialize violation count from DB so existing warnings are respected
    (async () => {
      try {
        const { count, error } = await supabase
          .from('violations')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', playerId);
        if (!error) {
          const c = typeof count === 'number' ? count : 0;
          violationCountRef.current = c;
          setViolationCount(c);
        }
      } catch (err) {
        console.error('Failed to init violation count', err);
      }
    })();

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      if (cameraMonitorIntervalRef.current) {
        clearInterval(cameraMonitorIntervalRef.current);
        cameraMonitorIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, playerId, logViolation]);

  // Lightweight heuristic to analyze a video stream for suspicious behavior.
  // This is a client-side heuristic (not a production AI). It samples a frame,
  // computes brightness/edge variance and flags very low variance frames as suspicious.
  async function analyzeVideoStreamForSuspiciousBehavior(stream: MediaStream): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = stream;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const handle = () => {
          try {
            if (!ctx) return resolve(false);
            canvas.width = Math.min(320, video.videoWidth || 320);
            canvas.height = Math.min(240, video.videoHeight || 240);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // compute simple luminance variance
            let sum = 0, sumSq = 0;
            for (let i = 0; i < img.data.length; i += 4) {
              const r = img.data[i];
              const g = img.data[i+1];
              const b = img.data[i+2];
              const lum = 0.2126*r + 0.7152*g + 0.0722*b;
              sum += lum;
              sumSq += lum * lum;
            }
            const n = img.data.length / 4;
            const mean = sum / n;
            const variance = Math.max(0, sumSq / n - mean * mean);
            // low variance suggests static or obscured frame -> suspicious
            const suspicious = variance < 20;
            resolve(suspicious);
          } catch (err) {
            console.error('analyze frame error', err);
            resolve(false);
          }
        };

        // Wait for video to have a frame
        if (video.readyState >= 2) {
          handle();
        } else {
          video.onloadeddata = () => setTimeout(handle, 100);
          setTimeout(() => handle(), 500);
        }
      } catch (err) {
        console.error('analysis setup failed', err);
        resolve(false);
      }
    });
  }

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (error) {
      console.error('Fullscreen request failed:', error);
    }
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return {
    violationCount,
    isFullscreen,
    cameraActive,
    showWarning,
    warningMessage,
    requestFullscreen,
    dismissWarning,
    remainingViolations: VIOLATION_THRESHOLD - violationCount,
  };
}

function getWarningMessage(type: string, count: number): string {
  const remaining = VIOLATION_THRESHOLD - count;
  const base = remaining > 0 
    ? `Warning ${count}/${VIOLATION_THRESHOLD}! ${remaining} more and you'll be disqualified.`
    : 'You have been disqualified!';

  switch (type) {
    case 'tab_switch':
      return `⚠️ Tab switch detected! ${base}`;
    case 'fullscreen_exit':
      return `⚠️ Fullscreen exit detected! ${base}`;
    case 'camera_off':
      return `⚠️ Camera disabled! ${base}`;
    default:
      return `⚠️ Violation detected! ${base}`;
  }
}
