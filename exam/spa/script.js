// Azure Practice Exams Application
// Multi-exam system with progress tracking and session management

// Application State
let examData = null;
let currentExam = null;
let availableQuestions = [];
let examQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let answeredQuestions = new Set();
let correctAnswers = 0;
let checkedQuestions = new Set();
let selectedTopics = [];
let questionLimit = null;

// Local Storage Keys - Dynamic based on exam
const getStorageKeys = (examId) => ({
    examSession: `${examId}_exam_session`,
    examState: `${examId}_exam_state`,
    selectedTopics: `${examId}_selected_topics`,
    questionLimit: `${examId}_question_limit`,
    activeExams: 'active_exams'
});

// Load questions from external JSON file
async function loadQuestions() {
    try {
        const response = await fetch('./data.json');
        examData = await response.json();
        
        // Debugging: Check what we received
        console.log('Loaded examData:', examData);
        console.log('examData.exams:', examData?.exams);
        
        // Validate structure
        if (!examData || !examData.exams) {
            throw new Error('Invalid JSON structure: Missing exams object');
        }
        
        initializeTestSelection();
    } catch (error) {
        console.error('Failed to load questions:', error);
        document.getElementById('test-selection-screen').innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center p-8">
                    <div class="text-red-600 text-6xl mb-4">⚠️</div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">Failed to Load Questions</h2>
                    <p class="text-gray-600 mb-4">Unable to load the question database. Please check:</p>
                    <ul class="text-left text-gray-600 mb-4 space-y-2">
                        <li>• Question file exists and is accessible</li>
                        <li>• JSON format is valid</li>
                        <li>• Network connection is working</li>
                    </ul>
                    <button onclick="location.reload()" class="bg-azure-500 text-white px-6 py-2 rounded-lg hover:bg-azure-600">
                        Try Again
                    </button>
                    <p class="text-gray-500 text-sm mt-2">Please check the browser console for more details.</p>
                </div>
            </div>
        `;
    }
}

// Initialize test selection screen
function initializeTestSelection() {
    displayAvailableTests();
    displayInProgressTests();
}

// Display available tests
function displayAvailableTests() {
    const container = document.getElementById('available-tests');
    container.innerHTML = '';

    Object.values(examData.exams).forEach(exam => {
        const testCard = document.createElement('div');
        testCard.className = 'bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer';
        testCard.onclick = () => selectTest(exam.id);
        
        testCard.innerHTML = `
            <div class="w-12 h-12 bg-azure-100 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-azure-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${exam.title}</h3>
            <p class="text-gray-600 text-sm mb-4">${exam.description}</p>
            <div class="flex items-center justify-between text-sm text-gray-500">
                <span>${exam.questions?.length || 0} Questions</span>
                <span class="text-azure-600 font-medium">Start Practice →</span>
            </div>
        `;
        
        container.appendChild(testCard);
    });
}

// Display in-progress tests
function displayInProgressTests() {
    const activeExams = JSON.parse(localStorage.getItem('active_exams') || '{}');
    const inProgressSection = document.getElementById('in-progress-section');
    const container = document.getElementById('in-progress-tests');
    
    container.innerHTML = '';
    
    const hasInProgress = Object.keys(activeExams).length > 0;
    
    if (hasInProgress) {
        inProgressSection.classList.remove('hidden');
        
        Object.entries(activeExams).forEach(([examId, sessionData]) => {
            const exam = examData.exams[examId];
            if (!exam) return; // Skip if exam no longer exists
            
            const answered = Object.keys(sessionData.userAnswers || {}).length;
            const total = sessionData.examQuestions?.length || 0;
            const progressPercent = total > 0 ? Math.round((answered / total) * 100) : 0;
            
            const progressCard = document.createElement('div');
            progressCard.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4';
            progressCard.innerHTML = `
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <h4 class="font-medium text-gray-900">${exam.title}</h4>
                        <p class="text-sm text-gray-600">Progress: ${answered}/${total} questions (${progressPercent}%)</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="resumeTest('${examId}')" class="bg-azure-500 text-white px-3 py-1 rounded text-sm hover:bg-azure-600">
                            Resume
                        </button>
                        <button onclick="resetTest('${examId}')" class="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400">
                            Reset
                        </button>
                    </div>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-azure-500 h-2 rounded-full" style="width: ${progressPercent}%"></div>
                </div>
            `;
            
            container.appendChild(progressCard);
        });
    } else {
        inProgressSection.classList.add('hidden');
    }
}

// Select a test and navigate to setup
function selectTest(examId) {
    currentExam = examData.exams[examId];
    availableQuestions = currentExam.questions;
    
    // Update UI
    document.getElementById('exam-title').textContent = currentExam.title;
    document.getElementById('exam-description').textContent = currentExam.description;
    
    // Show setup screen
    document.getElementById('test-selection-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    
    initializeSetup();
}

// Resume test
function resumeTest(examId) {
    const STORAGE_KEYS = getStorageKeys(examId);
    const sessionData = JSON.parse(localStorage.getItem(STORAGE_KEYS.examSession));
    
    currentExam = examData.exams[examId];
    examQuestions = sessionData.examQuestions;
    currentQuestionIndex = sessionData.currentQuestionIndex || 0;
    userAnswers = sessionData.userAnswers || {};
    answeredQuestions = new Set(sessionData.answeredQuestions || []);
    correctAnswers = sessionData.correctAnswers || 0;
    checkedQuestions = new Set(sessionData.checkedQuestions || []);
    selectedTopics = sessionData.selectedTopics || [];
    
    // Hide test selection and show exam
    document.getElementById('test-selection-screen').classList.add('hidden');
    document.getElementById('exam-screen').classList.remove('hidden');
    
    // Update exam title
    document.getElementById('exam-title').textContent = currentExam.title;
    
    startExamInterface();
}

// Reset test
function resetTest(examId) {
    if (confirm('Are you sure you want to reset this test? All progress will be lost.')) {
        const STORAGE_KEYS = getStorageKeys(examId);
        localStorage.removeItem(STORAGE_KEYS.examSession);
        localStorage.removeItem(STORAGE_KEYS.selectedTopics);
        localStorage.removeItem(STORAGE_KEYS.questionLimit);
        
        // Remove from active exams
        const activeExams = JSON.parse(localStorage.getItem('active_exams') || '{}');
        delete activeExams[examId];
        localStorage.setItem('active_exams', JSON.stringify(activeExams));
        
        // Refresh display
        displayInProgressTests();
    }
}

// Back to test selection
function backToTestSelection() {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('exam-screen').classList.add('hidden');
    document.getElementById('test-selection-screen').classList.remove('hidden');
    displayInProgressTests(); // Refresh in case of changes
}

// Initialize setup screen
function initializeSetup() {
    createTopicCheckboxes();
    checkForPreviousSession();
    
    document.getElementById('start-exam-btn').addEventListener('click', startExam);
    document.getElementById('back-to-tests-btn').addEventListener('click', backToTestSelection);
    
    const continueBtn = document.getElementById('continue-session-btn');
    const resetBtn = document.getElementById('reset-session-btn');
    if (continueBtn) continueBtn.addEventListener('click', continueSession);
    if (resetBtn) resetBtn.addEventListener('click', resetSession);
}

// Create topic selection checkboxes
function createTopicCheckboxes() {
    const container = document.getElementById('topic-checkboxes');
    const STORAGE_KEYS = getStorageKeys(currentExam.id);
    const savedTopics = localStorage.getItem(STORAGE_KEYS.selectedTopics);
    const savedLimit = localStorage.getItem(STORAGE_KEYS.questionLimit);
    
    if (savedLimit) {
        document.getElementById('question-count').value = savedLimit;
    }
    
    // Check if currentExam and topics exist
    if (!currentExam || !currentExam.topics) {
        console.error('currentExam or currentExam.topics is undefined');
        container.innerHTML = '<p class="text-red-600">Error: Unable to load topics</p>';
        return;
    }
    
    container.innerHTML = ''; // Clear existing content
    
    currentExam.topics.forEach(topic => {
        const questionCount = availableQuestions.filter(q => q.topic === topic.id).length;
        const isChecked = savedTopics ? JSON.parse(savedTopics).includes(topic.id) : true;
        
        const topicDiv = document.createElement('div');
        topicDiv.className = 'topic-filter bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md';
        topicDiv.innerHTML = `
            <label class="flex items-center cursor-pointer">
                <input type="checkbox" value="${topic.id}" class="topic-checkbox mr-3 text-azure-600 focus:ring-azure-500" 
                       ${isChecked ? 'checked' : ''}>
                <div class="flex-1">
                    <div class="font-medium text-gray-900">${topic.name}</div>
                    <div class="text-sm text-gray-500">${questionCount} questions available</div>
                </div>
            </label>
        `;
        container.appendChild(topicDiv);
    });
}

// Check for previous session
function checkForPreviousSession() {
    const STORAGE_KEYS = getStorageKeys(currentExam.id);
    const sessionData = localStorage.getItem(STORAGE_KEYS.examSession);
    if (sessionData) {
        const session = JSON.parse(sessionData);
        const answered = Object.keys(session.userAnswers || {}).length;
        const total = session.examQuestions?.length || 0;
        
        document.getElementById('continue-session-section').style.display = 'block';
        document.getElementById('previous-session-info').textContent = 
            `You have answered ${answered} out of ${total} questions. Continue where you left off or start fresh.`;
    }
}

// Start exam
function startExam() {
    const selectedCheckboxes = document.querySelectorAll('.topic-checkbox:checked');
    selectedTopics = Array.from(selectedCheckboxes).map(cb => cb.value);
    questionLimit = parseInt(document.getElementById('question-count').value) || null;
    
    if (selectedTopics.length === 0) {
        alert('Please select at least one topic to practice.');
        return;
    }
    
    const STORAGE_KEYS = getStorageKeys(currentExam.id);
    
    // Save selections
    localStorage.setItem(STORAGE_KEYS.selectedTopics, JSON.stringify(selectedTopics));
    if (questionLimit) {
        localStorage.setItem(STORAGE_KEYS.questionLimit, questionLimit.toString());
    }
    
    // Filter questions by selected topics
    examQuestions = availableQuestions.filter(q => selectedTopics.includes(q.topic));
    
    // Shuffle questions
    examQuestions = shuffleArray(examQuestions);
    
    // Limit questions if specified
    if (questionLimit && questionLimit < examQuestions.length) {
        examQuestions = examQuestions.slice(0, questionLimit);
    }
    
    if (examQuestions.length === 0) {
        alert('No questions found for selected topics.');
        return;
    }
    
    // Reset state
    currentQuestionIndex = 0;
    userAnswers = {};
    answeredQuestions = new Set();
    correctAnswers = 0;
    checkedQuestions = new Set();
    
    startExamInterface();
}

// Continue session
function continueSession() {
    const STORAGE_KEYS = getStorageKeys(currentExam.id);
    const sessionData = JSON.parse(localStorage.getItem(STORAGE_KEYS.examSession));
    
    examQuestions = sessionData.examQuestions;
    currentQuestionIndex = sessionData.currentQuestionIndex || 0;
    userAnswers = sessionData.userAnswers || {};
    answeredQuestions = new Set(sessionData.answeredQuestions || []);
    correctAnswers = sessionData.correctAnswers || 0;
    checkedQuestions = new Set(sessionData.checkedQuestions || []);
    selectedTopics = sessionData.selectedTopics || [];
    
    startExamInterface();
}

// Reset session
function resetSession() {
    const STORAGE_KEYS = getStorageKeys(currentExam.id);
    localStorage.removeItem(STORAGE_KEYS.examSession);
    document.getElementById('continue-session-section').style.display = 'none';
}

// Start exam interface
function startExamInterface() {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('exam-screen').classList.remove('hidden');
    
    // Update topic display
    const topicNames = selectedTopics.map(id => 
        currentExam.topics.find(t => t.id === id)?.name || id
    ).join(', ');
    document.getElementById('selected-topics-display').textContent = topicNames;
    
    initializeExam();
    
    // Set up event listeners
    document.getElementById('prev-btn').addEventListener('click', previousQuestion);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
    document.getElementById('check-btn').addEventListener('click', checkAnswer);
    document.getElementById('exit-exam-btn').addEventListener('click', exitExam);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyPress);
}

// Initialize the exam
function initializeExam() {
    displayQuestion();
    updateProgress();
    updateStats();
    saveSession();
}

// Display current question
function displayQuestion() {
    const question = examQuestions[currentQuestionIndex];
    
    // Add fade-in animation
    const container = document.getElementById('question-container');
    container.classList.remove('question-fade-in');
    
    setTimeout(() => {
        document.getElementById('question-text').textContent = question.question;
        document.getElementById('category-label').textContent = question.category;
        document.getElementById('module-label').textContent = question.module;
        
        // Clear previous answers
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = '';
        
        // Create answer options
        question.options.forEach((option, index) => {
            const isMultiple = question.type === 'multiple';
            const inputType = isMultiple ? 'checkbox' : 'radio';
            const inputName = isMultiple ? `question-${question.id}` : 'answer';
            
            const answerDiv = document.createElement('div');
            answerDiv.className = 'border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors';
            answerDiv.onclick = () => selectAnswer(index, isMultiple);
            
            const selectedAnswer = userAnswers[question.id];
            let isSelected = false;
            let isChecked = checkedQuestions.has(question.id);
            
            if (isMultiple) {
                isSelected = selectedAnswer && selectedAnswer.includes(index);
            } else {
                isSelected = selectedAnswer === index;
            }
            
            answerDiv.innerHTML = `
                <label class="flex items-start cursor-pointer">
                    <input type="${inputType}" 
                           name="${inputName}" 
                           value="${index}" 
                           class="mr-3 text-azure-600 focus:ring-azure-500"
                           ${isSelected ? 'checked' : ''}
                           ${isChecked ? 'disabled' : ''}
                    >
                    <span class="flex-1">${String.fromCharCode(65 + index)}. ${option}</span>
                </label>
            `;
            
            answersContainer.appendChild(answerDiv);
        });
        
        // Show feedback if question was already checked
        if (checkedQuestions.has(question.id)) {
            showFeedback();
        } else {
            document.getElementById('feedback-panel').classList.add('hidden');
        }
        
        container.classList.add('question-fade-in');
    }, 150);
    
    updateButtons();
}

// Select an answer
function selectAnswer(index, isMultiple) {
    const question = examQuestions[currentQuestionIndex];
    
    if (isMultiple) {
        if (!userAnswers[question.id]) {
            userAnswers[question.id] = [];
        }
        
        const currentAnswers = userAnswers[question.id];
        if (currentAnswers.includes(index)) {
            userAnswers[question.id] = currentAnswers.filter(i => i !== index);
        } else {
            userAnswers[question.id].push(index);
        }
        
        if (userAnswers[question.id].length === 0) {
            answeredQuestions.delete(question.id);
        } else {
            answeredQuestions.add(question.id);
        }
    } else {
        userAnswers[question.id] = index;
        answeredQuestions.add(question.id);
    }
    
    // Update visual selection
    updateAnswerDisplay();
    updateStats();
    updateButtons();
    saveSession();
}

// Update answer display
function updateAnswerDisplay() {
    const question = examQuestions[currentQuestionIndex];
    const answerDivs = document.getElementById('answers-container').children;
    const isMultiple = question.type === 'multiple';
    
    for (let i = 0; i < answerDivs.length; i++) {
        answerDivs[i].classList.remove('selected-answer');
        
        let isSelected = false;
        if (isMultiple) {
            isSelected = userAnswers[question.id] && userAnswers[question.id].includes(i);
        } else {
            isSelected = userAnswers[question.id] === i;
        }
        
        if (isSelected) {
            answerDivs[i].classList.add('selected-answer');
        }
        
        // Update input
        const input = answerDivs[i].querySelector('input');
        input.checked = isSelected;
    }
}

// Check the current answer
function checkAnswer() {
    const question = examQuestions[currentQuestionIndex];
    const selectedAnswer = userAnswers[question.id];
    
    if (selectedAnswer === undefined || (Array.isArray(selectedAnswer) && selectedAnswer.length === 0)) {
        alert('Please select an answer before checking.');
        return;
    }
    
    checkedQuestions.add(question.id);
    
    // Update statistics
    let isCorrect = false;
    if (question.type === 'multiple') {
        // For multiple choice, check if arrays match exactly
        const selected = selectedAnswer.sort();
        const correct = question.correct.sort();
        isCorrect = selected.length === correct.length && 
                   selected.every((val, i) => val === correct[i]);
    } else {
        isCorrect = selectedAnswer === question.correct;
    }
    
    if (isCorrect) {
        correctAnswers++;
    }
    
    // Disable all inputs
    const inputs = document.querySelectorAll('#answers-container input');
    inputs.forEach(input => input.disabled = true);
    
    // Update answer styling
    const answerDivs = document.getElementById('answers-container').children;
    for (let i = 0; i < answerDivs.length; i++) {
        const isCorrectAnswer = question.type === 'multiple' ? 
            question.correct.includes(i) : question.correct === i;
        const isSelectedAnswer = question.type === 'multiple' ?
            selectedAnswer.includes(i) : selectedAnswer === i;
        
        if (isCorrectAnswer) {
            answerDivs[i].classList.add('correct-answer');
        } else if (isSelectedAnswer && !isCorrectAnswer) {
            answerDivs[i].classList.add('incorrect-answer');
        }
    }
    
    showFeedback();
    updateStats();
    updateButtons();
    saveSession();
}

// Show feedback panel
function showFeedback() {
    const question = examQuestions[currentQuestionIndex];
    const selectedAnswer = userAnswers[question.id];
    
    let isCorrect = false;
    if (question.type === 'multiple') {
        const selected = selectedAnswer.sort();
        const correct = question.correct.sort();
        isCorrect = selected.length === correct.length && 
                   selected.every((val, i) => val === correct[i]);
    } else {
        isCorrect = selectedAnswer === question.correct;
    }
    
    const feedbackPanel = document.getElementById('feedback-panel');
    feedbackPanel.classList.remove('hidden');
    
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackExplanation = document.getElementById('feedback-explanation');
    
    if (isCorrect) {
        feedbackIcon.innerHTML = '✅';
        feedbackTitle.textContent = 'Correct!';
        feedbackTitle.className = 'font-medium text-green-800';
    } else {
        feedbackIcon.innerHTML = '❌';
        feedbackTitle.textContent = 'Incorrect';
        feedbackTitle.className = 'font-medium text-red-800';
        
        // Show correct answer for single choice
        if (question.type !== 'multiple') {
            const correctAnswerDiv = document.createElement('div');
            correctAnswerDiv.className = 'mt-2 p-2 bg-red-50 rounded border-l-4 border-red-400';
            correctAnswerDiv.innerHTML = `
                <div class="font-medium text-red-800 text-sm">Your Selection (${String.fromCharCode(65 + selectedAnswer)}):</div>
                <div class="text-red-700 text-sm">${question.options[selectedAnswer]}</div>
                <div class="font-medium text-green-800 text-sm mt-2">Correct Answer (${String.fromCharCode(65 + question.correct)}):</div>
                <div class="text-green-700 text-sm">${question.options[question.correct]}</div>
            `;
            feedbackPanel.appendChild(correctAnswerDiv);
        } else {
            // Show correct answers for multiple choice
            const correctAnswersDiv = document.createElement('div');
            correctAnswersDiv.className = 'mt-2 p-2 bg-red-50 rounded border-l-4 border-red-400';
            correctAnswersDiv.innerHTML = `
                <div class="font-medium text-red-800 text-sm">Your Selections:</div>
                ${selectedAnswer.map(index => `
                    <div class="font-medium text-red-800 text-sm">Your Selection (${String.fromCharCode(65 + index)}):</div>
                    <div class="text-red-700 text-sm">${question.options[index]}</div>
                `).join('')}
                <div class="font-medium text-green-800 text-sm mt-2">Correct Answers:</div>
                ${question.correct.map(index => `
                    <div class="text-green-700 text-sm">${String.fromCharCode(65 + index)}. ${question.options[index]}</div>
                `).join('')}
            `;
            feedbackPanel.appendChild(correctAnswersDiv);
        }
    }
    
    feedbackExplanation.textContent = question.explanation;
    feedbackExplanation.className = 'text-sm text-gray-600 mt-1';

    // Show detailed reasoning if available
    const reasoningText = document.getElementById('reasoning-text');
    if (question.reasoning && question.reasoning.correct) {
        document.getElementById('detailed-reasoning').style.display = 'block';
        reasoningText.textContent = question.reasoning.correct;
    } else {
        document.getElementById('detailed-reasoning').style.display = 'none';
    }

    // Show wrong answer explanations if the answer is incorrect and explanations exist
    const wrongAnswersSection = document.getElementById('wrong-answers-section');
    const wrongAnswersList = document.getElementById('wrong-answers-list');

    if (!isCorrect && question.reasoning && question.reasoning.why_others_wrong) {
        wrongAnswersSection.classList.remove('hidden');
        wrongAnswersList.innerHTML = '';
        
        Object.entries(question.reasoning.why_others_wrong).forEach(([optionIndex, explanation]) => {
            const optionLetter = String.fromCharCode(65 + parseInt(optionIndex));
            const listItem = document.createElement('li');
            listItem.className = 'mb-2';
            listItem.innerHTML = `<strong>Option ${optionLetter}:</strong> ${explanation}`;
            wrongAnswersList.appendChild(listItem);
        });
    } else {
        wrongAnswersSection.classList.add('hidden');
    }

    // Show reference link if available
    const referenceSection = document.getElementById('reference-section');
    const referenceLink = document.getElementById('reference-link');

    if (question.reference && question.reference.url) {
        referenceSection.style.display = 'block';
        referenceLink.href = question.reference.url;
        referenceLink.textContent = question.reference.title || 'Learn More';
    } else {
        referenceSection.style.display = 'none';
    }
}

// Navigate to previous question
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        updateProgress();
        saveSession();
    }
}

// Navigate to next question
function nextQuestion() {
    if (currentQuestionIndex < examQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateProgress();
        saveSession();
    }
}

// Update progress indicators
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = 
        `Question ${currentQuestionIndex + 1} of ${examQuestions.length}`;
}

// Update navigation buttons
function updateButtons() {
    const question = examQuestions[currentQuestionIndex];
    const hasAnswer = userAnswers[question.id] !== undefined && 
        (Array.isArray(userAnswers[question.id]) ? userAnswers[question.id].length > 0 : true);
    const isChecked = checkedQuestions.has(question.id);
    
    document.getElementById('prev-btn').disabled = currentQuestionIndex === 0;
    document.getElementById('next-btn').disabled = currentQuestionIndex === examQuestions.length - 1;
    
    const checkBtn = document.getElementById('check-btn');
    if (isChecked) {
        checkBtn.textContent = 'Checked ✓';
        checkBtn.className = 'inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed';
        checkBtn.disabled = true;
    } else {
        checkBtn.textContent = 'Check Answer';
        checkBtn.className = hasAnswer ? 
            'inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-azure-500 hover:bg-azure-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azure-500' :
            'inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed';
        checkBtn.disabled = !hasAnswer;
    }
}

// Update statistics
function updateStats() {
    const answered = answeredQuestions.size;
    const checked = checkedQuestions.size;
    const incorrect = checked - correctAnswers;
    const percent = checked > 0 ? Math.round((correctAnswers / checked) * 100) : 0;
    
    document.getElementById('score').textContent = `${correctAnswers}/${checked}`;
    document.getElementById('answered-count').textContent = answered;
    document.getElementById('correct-count').textContent = correctAnswers;
    document.getElementById('incorrect-count').textContent = incorrect;
    document.getElementById('percentage').textContent = `${percent}%`;
}

// Save session to localStorage
function saveSession() {
    const STORAGE_KEYS = getStorageKeys(currentExam.id);
    const sessionData = {
        examQuestions,
        currentQuestionIndex,
        userAnswers,
        answeredQuestions: Array.from(answeredQuestions),
        correctAnswers,
        checkedQuestions: Array.from(checkedQuestions),
        selectedTopics,
        examId: currentExam.id,
        lastActivity: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.examSession, JSON.stringify(sessionData));
    
    // Update active exams tracking
    const activeExams = JSON.parse(localStorage.getItem('active_exams') || '{}');
    activeExams[currentExam.id] = sessionData;
    localStorage.setItem('active_exams', JSON.stringify(activeExams));
}

// Exit exam
function exitExam() {
    if (confirm('Are you sure you want to exit the exam? Your progress will be saved.')) {
        saveSession();
        backToTestSelection();
    }
}

// Keyboard navigation
function handleKeyPress(e) {
    if (e.key === 'ArrowLeft') previousQuestion();
    if (e.key === 'ArrowRight') nextQuestion();
    if (e.key === 'Enter') {
        const checkBtn = document.getElementById('check-btn');
        if (!checkBtn.disabled) checkAnswer();
    }
    if (e.key >= '1' && e.key <= '9') {
        const optionIndex = parseInt(e.key) - 1;
        const question = examQuestions[currentQuestionIndex];
        if (optionIndex < question.options.length) {
            selectAnswer(optionIndex, question.type === 'multiple');
        }
    }
}

// Utility function to shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Initialize the application when page loads
window.addEventListener('DOMContentLoaded', loadQuestions);
