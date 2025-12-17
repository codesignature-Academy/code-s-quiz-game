import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Maximize, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProctoringSetupProps {
  onReady: () => void;
}

export function ProctoringSetup({ onReady }: ProctoringSetupProps) {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      setCameraError(false);
    } catch (error) {
      console.error('Camera access denied:', error);
      setCameraError(true);
    }
  };

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenReady(true);
    } catch (error) {
      console.error('Fullscreen request failed:', error);
    }
  };

  const canProceed = cameraReady && fullscreenReady;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Proctoring Setup</CardTitle>
          <CardDescription>
            To ensure fairness, please enable the following before starting the quiz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Camera check */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className={cn(
                  'w-5 h-5',
                  cameraReady ? 'text-success' : cameraError ? 'text-destructive' : 'text-muted-foreground'
                )} />
                <span className="font-medium">Camera Access</span>
              </div>
              {cameraReady ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : cameraError ? (
                <XCircle className="w-5 h-5 text-destructive" />
              ) : null}
            </div>
            
            {cameraReady ? (
              <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-success/90 text-white text-xs px-2 py-1 rounded">
                  Camera Active
                </div>
              </div>
            ) : (
              <Button
                onClick={requestCamera}
                variant={cameraError ? 'destructive' : 'outline'}
                className="w-full"
              >
                {cameraError ? 'Camera Blocked - Please Allow' : 'Enable Camera'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Your camera will be checked periodically. No recording is made.
            </p>
          </div>

          {/* Fullscreen check */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Maximize className={cn(
                  'w-5 h-5',
                  fullscreenReady ? 'text-success' : 'text-muted-foreground'
                )} />
                <span className="font-medium">Fullscreen Mode</span>
              </div>
              {fullscreenReady && <CheckCircle2 className="w-5 h-5 text-success" />}
            </div>
            
            {!fullscreenReady && (
              <Button
                onClick={requestFullscreen}
                variant="outline"
                className="w-full"
              >
                Enter Fullscreen
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Quiz must be taken in fullscreen. Exiting will be recorded as a violation.
            </p>
          </div>

          {/* Warnings */}
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <h4 className="font-semibold text-warning mb-2">⚠️ Important Rules</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Do not switch tabs or windows</li>
              <li>• Keep the camera on throughout the quiz</li>
              <li>• Stay in fullscreen mode</li>
              <li>• <strong>3 violations = automatic disqualification</strong></li>
            </ul>
          </div>

          {/* Start button */}
          <Button
            onClick={onReady}
            disabled={!canProceed}
            className="w-full gradient-primary text-white"
            size="lg"
          >
            {canProceed ? "I'm Ready - Start Quiz" : 'Complete Setup Above'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
