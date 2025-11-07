'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id?: string;
  questionName?: string; // Optional name for the question
  questionText: string;
  questionType: 'text' | 'image' | 'video';
  answerType: 'multiple choice' | 'estimation';
  answers: string[];
  image?: File | null;
  video?: File | null;
  imageUrl?: string;
  videoUrl?: string;
  isSaving?: boolean;
  isSaved?: boolean;
  order?: number; // For drag-and-drop ordering
}

function CreateQuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Function to trigger disco/party animation on successful save
  const triggerSaveAnimation = () => {
    // Add animation class to body temporarily
    document.body.classList.add('save-success-party');
    
    // Create confetti elements
    for (let i = 0; i < 9; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'save-success-confetti';
      confetti.style.left = `${10 + i * 10}%`;
      confetti.style.top = '10%';
      document.body.appendChild(confetti);
      
      setTimeout(() => {
        confetti.remove();
      }, 1500);
    }
    
    setTimeout(() => {
      document.body.classList.remove('save-success-party');
    }, 2000);
  };
  const editQuizId = searchParams.get('quizId');
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizName, setQuizName] = useState('Untitled Quiz');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const quizCreatedRef = useRef(false);
  const isEditing = !!editQuizId;
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const savedContentRef = useRef<Map<number, string>>(new Map()); // Track saved content to prevent duplicate saves
  const [editingQuestionName, setEditingQuestionName] = useState<number | null>(null); // Track which question name is being edited

  // Get auth token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  // Load quiz data on page load (create new or load existing)
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/login');
          return;
        }

        if (isEditing && editQuizId) {
          // Load existing quiz for editing
          const response = await fetch(`/api/quizzes/${editQuizId}?token=${encodeURIComponent(token)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to load quiz');
          }

          setQuizId(data.quiz.id);
          setQuizName(data.quiz.name || 'Untitled Quiz');
          
          console.log(`[CreateQuizPage] Loaded quiz ${data.quiz.id} with ${data.questions?.length || 0} questions`);
          console.log(`[CreateQuizPage] Questions data:`, data.questions);
          
          // Load existing questions
          if (!data.questions || data.questions.length === 0) {
            console.log(`[CreateQuizPage] No questions found for quiz ${data.quiz.id}`);
            setQuestions([]);
            setLoading(false);
            return;
          }
          const loadedQuestions: Question[] = data.questions.map((q: any, idx: number) => {
            // Ensure answers array is properly formatted
            let answers = q.answers || [];
            if (q.answerType === 'estimation') {
              // For estimation, ensure we have at least one answer slot
              if (answers.length === 0) {
                answers = [''];
              }
            } else {
              // For multiple choice, ensure we have 4 answer slots
              while (answers.length < 4) {
                answers.push('');
              }
              answers = answers.slice(0, 4); // Ensure exactly 4
            }
            
            return {
              id: q.id,
              questionName: q.questionName || undefined,
              questionText: q.questionText || '',
              questionType: (q.questionType || 'text') as 'text' | 'image' | 'video',
              answerType: (q.answerType || 'multiple choice') as 'multiple choice' | 'estimation',
              answers: answers,
              order: q.order !== undefined ? q.order : idx,
              imageUrl: q.imageUrl,
              videoUrl: q.videoUrl,
              isSaved: true,
            };
          });
          
          console.log(`[CreateQuizPage] Mapped ${loadedQuestions.length} questions to display`);
          setQuestions(loadedQuestions);
          
          // Initialize saved content hash for loaded questions
          loadedQuestions.forEach((q, idx) => {
            const contentHash = JSON.stringify({
              name: q.questionName,
              text: q.questionText,
              type: q.questionType,
              answerType: q.answerType,
              answers: q.answers,
              imageUrl: q.imageUrl,
              videoUrl: q.videoUrl,
            });
            savedContentRef.current.set(idx, contentHash);
          });
          
          setLoading(false);
        } else {
          // Create new quiz
          if (quizCreatedRef.current || quizId) {
            return;
          }

          quizCreatedRef.current = true;
          const response = await fetch('/api/quizzes/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: quizName,
              token,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create quiz');
          }

          setQuizId(data.quiz.id);
          setLoading(false);
        }
      } catch (err: any) {
        quizCreatedRef.current = false; // Reset on error so user can retry
        setError(err.message || 'Failed to load quiz');
        setLoading(false);
      }
    };

    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editQuizId]); // Re-run if editing mode or quizId changes

  // Auto-save question with debounce
  const saveQuestion = useCallback(
    async (question: Question, index: number): Promise<void> => {
      if (!quizId || !question.questionText.trim()) return;

      const token = getAuthToken();
      if (!token) return;

      // Mark as saving
      setQuestions((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isSaving: true };
        return updated;
      });

      try {
        // Map question types to Airtable's exact case-sensitive values
        const questionTypeMap: Record<string, string> = {
          'text': 'Text',
          'image': 'Image',
          'video': 'Video',
        };

        // Map answer types to Airtable's exact case-sensitive values
        const answerTypeMap: Record<string, string> = {
          'multiple choice': 'Multiple choice',
          'estimation': 'Estimation',
        };

        const questionData: any = {
          token,
          quizId,
          'Question name': question.questionName || undefined, // Optional question name
          'Question text': question.questionText,
          'Question type': questionTypeMap[question.questionType] || question.questionType,
          'Answer type': answerTypeMap[question.answerType] || question.answerType,
          // Note: Order field removed - add "Order" field to Airtable Questions table to enable persistent ordering
          // Order: question.order !== undefined ? question.order : index,
        };

        // Handle file uploads first - ALWAYS upload if there's an image file
        if (question.image) {
          // New image file uploaded - upload it
          console.log('[saveQuestion] Uploading image file:', question.image.name);
          const formData = new FormData();
          formData.append('file', question.image);
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const uploadData = await uploadResponse.json();
          if (uploadData.success) {
            console.log('[saveQuestion] Image uploaded successfully:', uploadData.url);
            const imageUrl = uploadData.url;
            // Airtable attachment format: array of objects with url and optional filename
            questionData.Image = [{ 
              url: imageUrl,
              filename: uploadData.filename || question.image?.name || 'image'
            }];
            console.log('[saveQuestion] Set questionData.Image to:', JSON.stringify(questionData.Image));
            // Update the question state with the new imageUrl
            setQuestions((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], imageUrl: imageUrl, image: null };
              return updated;
            });
            // Also update the local question reference to ensure imageUrl is available
            question.imageUrl = imageUrl;
            question.image = null;
          } else {
            console.error('[saveQuestion] Image upload failed:', uploadData);
            // Don't save if image upload failed
            return;
          }
        } else if (question.imageUrl) {
          // No new image file, but we have an existing imageUrl - preserve it
          // Include it regardless of question type, in case user switches types
          // Airtable attachment format: array of objects with url
          questionData.Image = [{ 
            url: question.imageUrl,
            filename: question.imageUrl.split('/').pop() || 'image'
          }];
          console.log('[saveQuestion] Preserving existing image URL:', question.imageUrl);
        }
        
        // If question type is 'image' but no image is set, clear the Image field
        if (question.questionType === 'image' && !questionData.Image && !question.imageUrl && !question.image) {
          questionData.Image = [];
          console.log('[saveQuestion] Clearing Image field for image type question with no image');
        }

        if (question.video) {
          // New video file uploaded - upload it
          const formData = new FormData();
          formData.append('file', question.video);
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const uploadData = await uploadResponse.json();
          if (uploadData.success) {
            questionData.Video = [{ url: uploadData.url }];
            // Update the question state with the new videoUrl
            setQuestions((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], videoUrl: uploadData.url, video: null };
              return updated;
            });
          }
        } else if (question.videoUrl && question.questionType === 'video') {
          // No new video file, but we have an existing videoUrl - preserve it
          questionData.Video = [{ url: question.videoUrl }];
        }

        // Add answers based on answer type
        if (question.answerType === 'multiple choice') {
          // Ensure we have at least 4 answer slots for multiple choice
          const answers = [...question.answers];
          while (answers.length < 4) {
            answers.push('');
          }
          
          // Save all answer options (A, B, C, D) - save empty strings if not filled
          for (let i = 0; i < 4; i++) {
            const answerKey = `Question answer ${String.fromCharCode(65 + i)}`; // A, B, C, D...
            questionData[answerKey] = (answers[i] || '').trim();
          }
          
          // Clear estimation answer field when using multiple choice
          questionData['Estimation answer'] = '';
        } else if (question.answerType === 'estimation') {
          // For estimation, save to "Estimation answer" field
          const estimationAnswer = question.answers[0] || '';
          questionData['Estimation answer'] = estimationAnswer.trim();
          
          // Clear multiple choice fields if switching to estimation
          questionData['Question answer A'] = '';
          questionData['Question answer B'] = '';
          questionData['Question answer C'] = '';
          questionData['Question answer D'] = '';
        }

        if (question.id) {
          // Update existing question
          // Remove quizId and token from questionData before sending (they're not Airtable fields)
          const { quizId: _, token: __, ...updateData } = questionData;
          
          console.log('[saveQuestion] Updating question with data:', {
            questionId: question.id,
            hasImage: !!updateData.Image,
            imageData: updateData.Image,
            questionType: updateData['Question type'],
          });
          
          const response = await fetch('/api/questions/update', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              questionId: question.id,
              token,
              ...updateData,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update question');
          }
        } else {
          // Create new question
          // Make sure Image field is included if we have an image
          if (question.imageUrl && !questionData.Image) {
            questionData.Image = [{ 
              url: question.imageUrl,
              filename: question.imageUrl.split('/').pop() || 'image'
            }];
            console.log('[saveQuestion] Adding Image field from imageUrl:', question.imageUrl);
          }
          
          console.log('[saveQuestion] Creating new question with data:', {
            hasImage: !!questionData.Image,
            imageData: questionData.Image,
            imageUrl: question.imageUrl,
            hasImageFile: !!question.image,
            allFields: Object.keys(questionData),
            questionDataKeys: Object.keys(questionData),
          });
          
          const response = await fetch('/api/questions/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(questionData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to save question');
          }

          // Update question with ID
          setQuestions((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], id: data.question.id, isSaved: true, isSaving: false };
            return updated;
          });
          
          // Trigger disco/party animation for successful save
          triggerSaveAnimation();
          
          // Update saved content hash for new question
          const contentHash = JSON.stringify({
            name: question.questionName,
            text: question.questionText,
            type: question.questionType,
            answerType: question.answerType,
            answers: question.answers,
            imageUrl: question.imageUrl,
            videoUrl: question.videoUrl,
          });
          savedContentRef.current.set(index, contentHash);
          return;
        }

        // Mark as saved
        setQuestions((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isSaved: true, isSaving: false };
          return updated;
        });
        
        // Trigger disco/party animation for successful save
        triggerSaveAnimation();
        
        // Update saved content hash
        const contentHash = JSON.stringify({
          name: question.questionName,
          text: question.questionText,
          type: question.questionType,
          answerType: question.answerType,
          answers: question.answers,
          imageUrl: question.imageUrl,
          videoUrl: question.videoUrl,
        });
        savedContentRef.current.set(index, contentHash);
      } catch (err: any) {
        console.error('Error saving question:', err);
        setQuestions((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isSaving: false };
          return updated;
        });
      }
    },
    [quizId]
  );

  // Debounced save - only trigger on actual content changes, not state flags
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    questions.forEach((question, index) => {
      // Create a content hash to track if question content actually changed
      const contentHash = JSON.stringify({
        name: question.questionName,
        text: question.questionText,
        type: question.questionType,
        answerType: question.answerType,
        answers: question.answers,
        imageUrl: question.imageUrl,
        videoUrl: question.videoUrl,
      });
      
      const previousHash = savedContentRef.current.get(index);
      
      // Only auto-save if:
      // 1. Question has content
      // 2. Not currently saving
      // 3. Content has actually changed from what we last saved
      if (question.questionText.trim() && !question.isSaving && contentHash !== previousHash) {
        const timeout = setTimeout(() => {
          saveQuestion(question, index).then(() => {
            // Mark this content as saved after successful save
            savedContentRef.current.set(index, contentHash);
          }).catch(() => {
            // On error, don't update the saved hash so it will retry
          });
        }, 1000); // 1 second debounce
        timeouts.push(timeout);
      }
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
    // Only depend on question content, not state flags like isSaving/isSaved
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.map(q => JSON.stringify({
    text: q.questionText,
    type: q.questionType,
    answerType: q.answerType,
    answers: q.answers,
    imageUrl: q.imageUrl,
    videoUrl: q.videoUrl,
  })).join('|'), saveQuestion]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        questionType: 'text',
        answerType: 'multiple choice',
        answers: ['', '', '', ''],
        order: questions.length,
      },
    ]);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder questions
    const newQuestions = [...questions];
    const [draggedQuestion] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestion);

    // Update order numbers
    const updatedQuestions = newQuestions.map((q, idx) => ({
      ...q,
      order: idx,
    }));

    setQuestions(updatedQuestions);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Note: Order saving disabled until "Order" field is added to Airtable Questions table
    // The drag-and-drop will work in the UI, but order won't persist until the field exists
    // To enable persistent ordering:
    // 1. Add a Number field named "Order" to your Airtable Questions table
    // 2. Uncomment the code below
    
    // const token = getAuthToken();
    // if (!token) return;
    // 
    // // Update order for all questions that have been saved
    // for (let i = 0; i < updatedQuestions.length; i++) {
    //   const question = updatedQuestions[i];
    //   if (question.id) {
    //     try {
    //       await fetch('/api/questions/update', {
    //         method: 'PUT',
    //         headers: {
    //           'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({
    //           questionId: question.id,
    //           token,
    //           Order: i, // Save the new order position
    //         }),
    //       });
    //     } catch (err) {
    //       console.error('Error updating question order:', err);
    //     }
    //   }
    // }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const currentQuestion = updated[index];
      
      // If switching answer type, reset answers appropriately
      if (updates.answerType && updates.answerType !== currentQuestion.answerType) {
        if (updates.answerType === 'estimation') {
          updates.answers = [currentQuestion.answers[0] || ''];
        } else if (updates.answerType === 'multiple choice') {
          // Ensure we have 4 answer slots
          const newAnswers = [...currentQuestion.answers];
          while (newAnswers.length < 4) {
            newAnswers.push('');
          }
          updates.answers = newAnswers.slice(0, 4);
        }
      }
      
      updated[index] = { ...updated[index], ...updates, isSaved: false };
      return updated;
    });
  };

  const updateAnswer = (questionIndex: number, answerIndex: number, value: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const currentQuestion = updated[questionIndex];
      const newAnswers = [...currentQuestion.answers];
      
      // Ensure array is long enough for multiple choice (need 4 slots)
      if (currentQuestion.answerType === 'multiple choice') {
        while (newAnswers.length < 4) {
          newAnswers.push('');
        }
      }
      
      // Update the specific answer
      newAnswers[answerIndex] = value;
      
      updated[questionIndex] = { ...updated[questionIndex], answers: newAnswers, isSaved: false };
      return updated;
    });
  };

  const handleFileChange = (questionIndex: number, type: 'image' | 'video', file: File | null) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (type === 'image') {
        updated[questionIndex] = { ...updated[questionIndex], image: file, isSaved: false };
      } else {
        updated[questionIndex] = { ...updated[questionIndex], video: file, isSaved: false };
      }
      return updated;
    });
  };

  const handleSaveQuiz = async () => {
    if (!quizId) return;
    
    setSaving(true);
    try {
      // Save any unsaved questions first
      for (let i = 0; i < questions.length; i++) {
        if (questions[i].questionText.trim() && !questions[i].isSaved) {
          await saveQuestion(questions[i], i);
        }
      }

      // Update quiz name if it has changed
      const token = getAuthToken();
      if (token && quizName.trim()) {
        const response = await fetch(`/api/quizzes/${quizId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: quizName,
            token,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update quiz name');
        }
      }

      // Navigate to quizzes overview
      router.push('/quizzes');
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      setError(err.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="text-center">
          <div className="disco-ball mb-8"></div>
          <h2 className="text-gradient text-2xl mb-4">Creating your quiz...</h2>
          <p className="text-secondary">Please wait</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="card max-w-md">
          <h2 className="text-gradient text-center mb-4">Error</h2>
          <p className="text-secondary mb-6">{error}</p>
          <Link href="/" className="btn btn-primary w-full">
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen party-container py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="card mb-8">
          <h1 className="text-gradient text-3xl mb-4">Create Your Quiz</h1>
          <input
            type="text"
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            className="input mb-4"
            placeholder="Quiz Name"
          />
          <div className="flex gap-4">
            <button onClick={handleSaveQuiz} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Quiz'}
            </button>
            <Link href="/quizzes" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.length === 0 && !loading && (
            <div className="card text-center py-8">
              <p className="text-secondary">No questions yet. Click &quot;+ Add Question&quot; to get started!</p>
            </div>
          )}
          {questions.map((question, questionIndex) => (
            <div
              key={question.id || questionIndex}
              draggable
              onDragStart={() => handleDragStart(questionIndex)}
              onDragOver={(e) => handleDragOver(e, questionIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, questionIndex)}
              onDragEnd={handleDragEnd}
              className={`card cursor-move transition-all ${
                draggedIndex === questionIndex ? 'opacity-50 scale-95' : ''
              } ${
                dragOverIndex === questionIndex && draggedIndex !== questionIndex
                  ? 'border-2 border-accent shadow-glow-accent'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-secondary text-lg">⋮⋮</div>
                  {editingQuestionName === questionIndex ? (
                    <input
                      type="text"
                      value={question.questionName || ''}
                      onChange={(e) => updateQuestion(questionIndex, { questionName: e.target.value })}
                      onBlur={() => setEditingQuestionName(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          setEditingQuestionName(null);
                        }
                      }}
                      className="input text-xl font-bold bg-transparent border-2 border-accent rounded-party px-3 py-1"
                      placeholder={`Question ${questionIndex + 1}`}
                      autoFocus
                    />
                  ) : (
                    <h3
                      className="text-xl text-gradient cursor-pointer hover:text-accent transition-colors"
                      onClick={() => setEditingQuestionName(questionIndex)}
                      title="Click to edit name"
                    >
                      {question.questionName || `Question ${questionIndex + 1}`}
                    </h3>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {question.isSaving && (
                    <span className="text-sm text-secondary">Saving...</span>
                  )}
                  {question.isSaved && !question.isSaving && (
                    <span className="text-sm text-green-400 save-success-badge">✓ Saved</span>
                  )}
                </div>
              </div>

              {/* Question Type Selector */}
              <div className="mb-4">
                <label className="block text-secondary mb-2">Question Type</label>
                <div className="flex gap-4">
                  {(['text', 'image', 'video'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => updateQuestion(questionIndex, { questionType: type })}
                      className={`btn ${question.questionType === type ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Type Selector */}
              <div className="mb-4">
                <label className="block text-secondary mb-2">Answer Format</label>
                <div className="flex gap-4">
                  {(['multiple choice', 'estimation'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => updateQuestion(questionIndex, { answerType: type })}
                      className={`btn ${question.answerType === type ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <label className="block text-secondary mb-2">Question Text</label>
                <textarea
                  value={question.questionText}
                  onChange={(e) => updateQuestion(questionIndex, { questionText: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="Enter your question..."
                />
              </div>

              {/* Image Upload (if image type) */}
              {question.questionType === 'image' && (
                <div className="mb-4">
                  <label className="block text-secondary mb-2">Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange(questionIndex, 'image', e.target.files?.[0] || null)
                    }
                    className="input"
                  />
                  {question.image && (
                    <p className="text-sm text-secondary mt-2">
                      Selected: {question.image.name}
                    </p>
                  )}
                </div>
              )}

              {/* Video Upload (if video type) */}
              {question.questionType === 'video' && (
                <div className="mb-4">
                  <label className="block text-secondary mb-2">Video</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) =>
                      handleFileChange(questionIndex, 'video', e.target.files?.[0] || null)
                    }
                    className="input"
                  />
                  {question.video && (
                    <p className="text-sm text-secondary mt-2">
                      Selected: {question.video.name}
                    </p>
                  )}
                </div>
              )}

              {/* Answers */}
              {question.answerType === 'multiple choice' ? (
                <div className="space-y-3">
                  <label className="block text-secondary mb-2">Answer Options</label>
                  {question.answers.map((answer, answerIndex) => (
                    <input
                      key={answerIndex}
                      type="text"
                      value={answer}
                      onChange={(e) => updateAnswer(questionIndex, answerIndex, e.target.value)}
                      className="input"
                      placeholder={`Option ${String.fromCharCode(65 + answerIndex)}`}
                    />
                  ))}
                </div>
              ) : (
                <div>
                  <label className="block text-secondary mb-2">Correct Answer</label>
                  <input
                    type="text"
                    value={question.answers[0] || ''}
                    onChange={(e) => updateAnswer(questionIndex, 0, e.target.value)}
                    className="input"
                    placeholder="Enter the correct answer"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <div className="mt-8 text-center">
          <button onClick={addQuestion} className="btn btn-accent text-2xl px-8 py-4">
            + Add Question
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CreateQuizPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center party-container">
        <div className="text-center">
          <div className="disco-ball mb-8"></div>
          <h2 className="text-gradient text-2xl mb-4">Loading...</h2>
        </div>
      </main>
    }>
      <CreateQuizPageContent />
    </Suspense>
  );
}

