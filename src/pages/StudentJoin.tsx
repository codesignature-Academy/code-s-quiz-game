import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Users, ArrowRight } from 'lucide-react';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import { Helmet } from 'react-helmet-async';

export default function StudentJoin() {
  const navigate = useNavigate();
  const { code } = useParams<{ code?: string }>();
  const [gameCode, setGameCode] = useState(code?.toUpperCase() || '');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const deviceFingerprint = useDeviceFingerprint();

  const handleJoin = async () => {
    if (!gameCode.trim() || !fullName.trim()) {
      toast.error('Please enter game code and your name');
      return;
    }

    if (!deviceFingerprint) {
      toast.error('Please wait...');
      return;
    }

    setLoading(true);
    try {
      // Find session
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('game_code', gameCode.toUpperCase())
        .single();

      if (sessionError || !session) {
        toast.error('Invalid game code');
        setLoading(false);
        return;
      }

      if (session.status === 'ended') {
        toast.error('This quiz has already ended');
        setLoading(false);
        return;
      }

      // Check for existing player with same device
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', session.id)
        .eq('device_fingerprint', deviceFingerprint)
        .single();

      if (existingPlayer) {
        // Rejoin existing session
        toast.success('Welcome back!');
        navigate(`/play/${session.id}/${existingPlayer.id}`);
        return;
      }

      // Create new player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          session_id: session.id,
          full_name: fullName.trim(),
          student_id: studentId.trim() || null,
          device_fingerprint: deviceFingerprint,
        })
        .select()
        .single();

      if (playerError) {
        if (playerError.code === '23505') {
          toast.error('You have already joined from this device');
        } else {
          throw playerError;
        }
        setLoading(false);
        return;
      }

      toast.success('Joined successfully!');
      console.debug('StudentJoin: player created', player?.id, 'session', session.id);
      navigate(`/play/${session.id}/${player.id}`);
    } catch (error) {
      console.error('Join error:', error);
      toast.error('Failed to join quiz');
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Join Quiz - QuizMaster Pro</title>
        <meta name="description" content="Join a live quiz session with your game code" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full gradient-secondary flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Join Quiz</CardTitle>
            <CardDescription>Enter your details to join the game</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Game Code *</Label>
              <Input
                placeholder="e.g., ABC123"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="text-center text-2xl font-bold tracking-widest"
                maxLength={6}
              />
            </div>
            <div>
              <Label>Your Full Name *</Label>
              <Input
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <Label>Student ID (optional)</Label>
              <Input
                placeholder="e.g., STU-2024-001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleJoin}
              disabled={loading || !gameCode.trim() || !fullName.trim()}
              className="w-full gradient-primary text-white"
              size="lg"
            >
              {loading ? 'Joining...' : 'Join Game'} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
