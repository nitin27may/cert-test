'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExamData } from '@/hooks/useExamData';
import { Question } from '@/lib/types';

interface ExamConfig {
  selectedTopics: string[];
  questionCount: number;
  timeLimit: number;
}

export default function ExamPracticePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  
  // Load configuration from sessionStorage
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(20);
  
  useEffect(() => {
    const configStr = sessionStorage.getItem(`exam-config-${examId}`);
    if (!configStr) {
      router.push(`/exam/${examId}/setup`);
      return;
    }
    const examConfig: ExamConfig = JSON.parse(configStr);
    setConfig(examConfig);
    setQuestionCount(examConfig.questionCount);
  }, [examId, router]);

  const { exam, questions, loading: isLoading, error } = useExamData(examId, questionCount);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Initialize timer when config is loaded
  useEffect(() => {
    if (config && timeRemaining === 0) {
      setTimeRemaining(config.timeLimit * 60); // Convert minutes to seconds
    }
  }, [config]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Redirect if there's an error loading exam data
  useEffect(() => {
    if (error) {
      console.error('Failed to load exam:', error);
      router.push('/');
    }
  }, [error, router]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answerIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  };

  const handleCheckAnswer = () => {
    setShowExplanation(true);
    setCheckedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: true
    }));
  };

  const handlePauseTest = () => {
    if (confirm('Are you sure you want to pause this test? Your progress will be saved.')) {
      // Save current progress
      const progress = {
        currentQuestionIndex,
        userAnswers,
        checkedAnswers,
        timeRemaining,
        pausedAt: Date.now()
      };
      sessionStorage.setItem(`exam-progress-${examId}`, JSON.stringify(progress));
      router.push('/');
    }
  };

  const getQuestionStatus = (questionIndex: number) => {
    const hasAnswer = userAnswers.hasOwnProperty(questionIndex);
    const isChecked = checkedAnswers[questionIndex];
    
    if (!hasAnswer) return 'unanswered';
    if (!isChecked) return 'answered';
    
    const isCorrect = userAnswers[questionIndex] === questions[questionIndex].correct;
    return isCorrect ? 'correct' : 'incorrect';
  };

  const handleFinishExam = () => {
    // Calculate score
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (userAnswers[index] === question.correct) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 100);
    
    // Store results
    const results = {
      examId,
      score,
      correctAnswers,
      totalQuestions: questions.length,
      timeSpent: config ? (config.timeLimit * 60 - timeRemaining) : 0,
      answers: userAnswers
    };
    
    sessionStorage.setItem(`exam-results-${examId}`, JSON.stringify(results));
    
    // Navigate to results page (you can create this later)
    alert(`Exam completed! Score: ${score}% (${correctAnswers}/${questions.length})`);
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading exam...</div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">No questions available</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const userAnswer = userAnswers[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePauseTest}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
              >
                Pause Test
              </button>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-gray-600">Time Remaining</div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {currentQuestion.topic}
                </span>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {currentQuestion.question}
              </h2>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = userAnswer === index;
                  const isCorrect = index === currentQuestion.correct;
                  const showResult = showExplanation;
                  
                  let buttonClass = "w-full text-left p-4 border rounded-lg transition-colors ";
                  
                  if (showResult) {
                    if (isCorrect) {
                      buttonClass += "bg-green-100 border-green-500 text-green-800";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "bg-red-100 border-red-500 text-red-800";
                    } else {
                      buttonClass += "bg-gray-50 border-gray-200 text-gray-600";
                    }
                  } else {
                    if (isSelected) {
                      buttonClass += "bg-blue-100 border-blue-500 text-blue-800";
                    } else {
                      buttonClass += "bg-white border-gray-200 text-gray-900 hover:bg-gray-50";
                    }
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={buttonClass}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Explanation:</h3>
                  <p className="text-blue-800 mb-4">{currentQuestion.explanation}</p>
                  
                  <div className="text-sm">
                    <div className="font-semibold text-green-800 mb-2">
                      Why this is correct:
                    </div>
                    <p className="text-green-700 mb-4">{currentQuestion.reasoning.correct}</p>
                    
                    <div className="font-semibold text-red-800 mb-2">
                      Why other options are wrong:
                    </div>
                    {Object.entries(currentQuestion.reasoning.why_others_wrong).map(([key, reason]) => (
                      <div key={key} className="text-red-700 mb-2">
                        <span className="font-medium">
                          {String.fromCharCode(65 + parseInt(key))}.
                        </span> {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex space-x-3">
                  {userAnswer !== undefined && !showExplanation && (
                    <button
                      onClick={handleCheckAnswer}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                      Check Answer
                    </button>
                  )}
                  
                  {currentQuestionIndex === questions.length - 1 ? (
                    <button
                      onClick={handleFinishExam}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Finish Exam
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Overview</h3>
              
              {/* Question Dots Grid */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((_, index) => {
                  const status = getQuestionStatus(index);
                  const isActive = index === currentQuestionIndex;
                  
                  let dotClass = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-colors ";
                  
                  if (isActive) {
                    dotClass += "ring-2 ring-blue-500 ring-offset-1 ";
                  }
                  
                  switch (status) {
                    case 'correct':
                      dotClass += "bg-green-500 text-white";
                      break;
                    case 'incorrect':
                      dotClass += "bg-red-500 text-white";
                      break;
                    case 'answered':
                      dotClass += "bg-yellow-500 text-white";
                      break;
                    case 'unanswered':
                      dotClass += "bg-gray-200 text-gray-600 hover:bg-gray-300";
                      break;
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentQuestionIndex(index);
                        setShowExplanation(false);
                      }}
                      className={dotClass}
                      title={`Question ${index + 1} - ${status}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                  <span>Correct</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                  <span>Incorrect</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-200 rounded-full mr-2"></div>
                  <span>Unanswered</span>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span>Answered:</span>
                    <span>{Object.keys(userAnswers).length}/{questions.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Checked:</span>
                    <span>{Object.keys(checkedAnswers).length}/{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span>{Math.round((Object.keys(userAnswers).length / questions.length) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
