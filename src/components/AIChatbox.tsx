import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PracticeRecommendations } from "./PracticeRecommendations";
import { AdaptiveAICoachService, AdaptiveCoachContext } from "@/services/adaptiveAICoachService";
import { useAdaptiveLearning } from "@/hooks/useAdaptiveLearning";
import { AdaptiveMetricsService } from "@/services/adaptiveMetricsService";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  practiceRecommendations?: Array<{
    skillName: string;
    currentScore: number;
    difficulty: 'Review' | 'Standard' | 'Challenge';
    estimatedTime: string;
    expectedImprovement: string;
    category: 'PRIORITY' | 'REVIEW' | 'CHALLENGE';
  }>;
}

interface StudentContext {
  studentName: string;
  className: string;
  classSubject: string;
  classGrade: string;
  teacher: string;
  contentSkillScores: any[];
  subjectSkillScores: any[];
  testResults: any[];
  groupedSkills: Record<string, any[]>;
  classId?: string;
}

interface AIChatboxProps {
  studentContext: StudentContext;
}

export function AIChatbox({ studentContext }: AIChatboxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hi ${studentContext.studentName}! 👋 I'm your AI learning assistant. Let's reach your goals! I can help you understand your progress in ${studentContext.classSubject}, answer questions about your test scores, and suggest ways to improve. Ask me "What should I work on?" for personalized practice recommendations!`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [sessionStartTime] = useState(() => new Date());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get student ID from context (assuming it's available)
  const studentId = studentContext.studentName; // You may need to adjust this based on your actual student ID source
  
  // Use adaptive learning hook
  const { 
    profile, 
    logLearningEvent, 
    updateLearningVelocity,
    getAdaptiveRecommendations 
  } = useAdaptiveLearning(studentId);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parsePracticeRecommendations = (content: string) => {
    const practiceStart = content.indexOf('**PRACTICE_RECOMMENDATIONS**');
    const practiceEnd = content.indexOf('**END_PRACTICE_RECOMMENDATIONS**');
    
    if (practiceStart === -1 || practiceEnd === -1) {
      return { cleanContent: content, recommendations: [] };
    }

    const practiceSection = content.substring(practiceStart + 29, practiceEnd).trim();
    const cleanContent = content.replace(content.substring(practiceStart, practiceEnd + 33), '').trim();
    
    const recommendations: any[] = [];
    const lines = practiceSection.split('\n').filter(line => line.trim());
    
    let currentCategory = '';
    
    lines.forEach(line => {
      line = line.trim();
      
      if (line.includes('PRIORITY')) {
        currentCategory = 'PRIORITY';
      } else if (line.includes('REVIEW')) {
        currentCategory = 'REVIEW';
      } else if (line.includes('CHALLENGE')) {
        currentCategory = 'CHALLENGE';
      } else if (line.startsWith('- ') && currentCategory) {
        // Parse recommendation line: "- Skill Name: 65% | Difficulty: Review | Time: 15-20 min | Improvement: +15-20%"
        const parts = line.substring(2).split(' | ');
        if (parts.length >= 4) {
          const [skillPart, difficultyPart, timePart, improvementPart] = parts;
          const [skillName, scoreStr] = skillPart.split(': ');
          const currentScore = parseInt(scoreStr?.replace('%', '') || '0');
          const difficulty = difficultyPart.split(': ')[1]?.trim() as 'Review' | 'Standard' | 'Challenge';
          const estimatedTime = timePart.split(': ')[1]?.trim() || '';
          const expectedImprovement = improvementPart.split(': ')[1]?.trim() || '';
          
          if (skillName && difficulty) {
            recommendations.push({
              skillName: skillName.trim(),
              currentScore,
              difficulty,
              estimatedTime,
              expectedImprovement,
              category: currentCategory
            });
          }
        }
      }
    });

    return { cleanContent, recommendations };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the AI chat edge function for base response
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: currentInput,
          studentContext: {
            ...studentContext,
            classId: studentContext.classId
          }
        }
      });

      if (error) {
        throw error;
      }

      const baseResponse = data.response || "I'm sorry, I couldn't generate a response. Please try again.";

      // Prepare adaptive learning context
      const sessionDurationMinutes = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / (1000 * 60));
      const adaptiveContext: AdaptiveCoachContext = {
        studentId: studentId,
        studentName: studentContext.studentName,
        skill_name: studentContext.classSubject, // Using subject as skill for now
        skill_type: 'subject',
        current_performance: calculateAverageScore(studentContext.contentSkillScores, studentContext.subjectSkillScores),
        current_confidence: 0.7, // Default confidence, could be enhanced
        session_duration_minutes: sessionDurationMinutes,
        conversation_id: conversationId,
        message_history: messages.concat(userMessage).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp.toISOString()
        }))
      };

      // Generate adaptive response
      const adaptiveResponse = await AdaptiveAICoachService.generateAdaptiveResponse(
        baseResponse,
        adaptiveContext
      );

      const { cleanContent, recommendations } = parsePracticeRecommendations(adaptiveResponse.response);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: cleanContent,
        sender: 'ai',
        timestamp: new Date(),
        practiceRecommendations: recommendations.length > 0 ? recommendations : undefined
      };

      setMessages(prev => [...prev, aiMessage]);

      // Track metrics
      const helpRequests = messages.filter(msg => 
        msg.sender === 'user' && msg.content.toLowerCase().includes('help')
      ).length;

      await AdaptiveMetricsService.trackEngagement(
        studentId,
        sessionDurationMinutes,
        messages.length + 1,
        helpRequests
      );

      // Track difficulty accuracy if applicable
      if (adaptiveResponse.difficulty_level && adaptiveContext.current_performance) {
        await AdaptiveMetricsService.trackDifficultyAccuracy(
          studentId,
          adaptiveResponse.difficulty_level,
          adaptiveContext.current_performance,
          adaptiveContext.skill_name
        );
      }

      // Track recommendation effectiveness
      if (adaptiveResponse.recommendations && adaptiveResponse.recommendations.length > 0) {
        for (const rec of adaptiveResponse.recommendations) {
          await AdaptiveMetricsService.trackRecommendationEffectiveness(
            studentId,
            rec.type,
            true, // Assume followed if generated
            0.8 // Default effectiveness score
          );
        }
      }

      // Log learning events if significant
      if (adaptiveResponse.learning_event) {
        await logLearningEvent(adaptiveResponse.learning_event);
      }

      // Update learning velocity if performance data available
      if (adaptiveContext.current_performance) {
        const performanceChange = adaptiveContext.current_performance - 0.7;
        await updateLearningVelocity(performanceChange);
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAverageScore = (contentScores: any[], subjectScores: any[]): number => {
    const allScores = [...contentScores, ...subjectScores];
    if (allScores.length === 0) return 0.7; // Default
    const sum = allScores.reduce((acc, score) => acc + (score.score || 0), 0);
    return sum / allScores.length / 100; // Convert to 0-1 scale
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 transition-all duration-300 ease-in-out ${
      isExpanded ? 'h-[600px]' : 'h-96'
    }`}>
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-blue-200 bg-white/50 rounded-t-lg">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">AI Learning Assistant</h3>
          <p className="text-sm text-gray-600">Let's reach your goals! 🎯</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0 hover:bg-blue-100 transition-colors"
          title={isExpanded ? "Collapse chat" : "Expand chat"}
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4 text-blue-600" />
          ) : (
            <Maximize2 className="h-4 w-4 text-blue-600" />
          )}
        </Button>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <div
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <User className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
              
              {/* Practice Recommendations */}
              {message.practiceRecommendations && (
                <div className="ml-10">
                  <PracticeRecommendations 
                    recommendations={message.practiceRecommendations}
                    classId={studentContext.classId}
                  />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-blue-200 bg-white/50 rounded-b-lg">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your progress, test scores, or 'What should I work on?'..."
            className="flex-1 border-blue-200 focus:border-blue-400 focus:ring-blue-400"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
