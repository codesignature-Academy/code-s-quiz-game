import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Shield, Trophy, Zap, Monitor } from "lucide-react";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>QuizMaster Pro - Real-Time Classroom Quizzes</title>
        <meta name="description" content="Engage your classroom with real-time quizzes. Fair selection of top performers with built-in proctoring." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="text-center mb-12 md:mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Built-in Proctoring & Anti-Cheating
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
              QuizMaster <span className="text-primary">Pro</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Engage your classroom with real-time quizzes. Fairly select your top 3 performers with accuracy, speed, and integrity.
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 bg-card/50 backdrop-blur">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">I'm a Teacher</CardTitle>
                <CardDescription>Create quizzes, manage sessions, and monitor students in real-time</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/teacher">
                  <Button className="w-full h-12 text-lg font-semibold" size="lg">
                    Teacher Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-secondary/50 bg-card/50 backdrop-blur">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Users className="w-8 h-8 text-secondary-foreground" />
                </div>
                <CardTitle className="text-2xl">I'm a Student</CardTitle>
                <CardDescription>Join a quiz session using your teacher's game code</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/student">
                  <Button variant="secondary" className="w-full h-12 text-lg font-semibold" size="lg">
                    Join Quiz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-foreground">
              Why QuizMaster Pro?
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Real-Time"
                description="Live leaderboard updates and instant feedback for engaging quizzes"
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Anti-Cheating"
                description="Tab detection, fullscreen mode, camera checks, and device locking"
              />
              <FeatureCard
                icon={<Trophy className="w-6 h-6" />}
                title="Fair Ranking"
                description="Speed bonuses and integrity checks ensure the best students win"
              />
              <FeatureCard
                icon={<Monitor className="w-6 h-6" />}
                title="Mobile-First"
                description="Works beautifully on phones, tablets, and desktops"
              />
              <FeatureCard
                icon={<Users className="w-6 h-6" />}
                title="Scalable"
                description="Handle 100+ concurrent students with ease"
              />
              <FeatureCard
                icon={<GraduationCap className="w-6 h-6" />}
                title="Easy to Use"
                description="Simple interface for both teachers and students"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/50 py-6 mt-12">
          <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
            <p>Built for Nigerian classrooms and school environments</p>
          </div>
        </footer>
      </div>
    </>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-card/30 border border-border/50 hover:bg-card/50 transition-colors">
    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default Index;
