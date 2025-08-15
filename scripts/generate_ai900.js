const fs = require('fs');
const path = require('path');

const DATA_PATH = path.resolve('/workspace/exam/public/data/exams.json');

function loadJson(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(content);
}

function saveJson(filePath, data) {
	const json = JSON.stringify(data, null, 2);
	fs.writeFileSync(filePath, json, 'utf8');
}

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

// Shared reference links (Microsoft Learn)
const refs = {
	responsibleAI: {
		title: 'Microsoft Responsible AI principles',
		url: 'https://learn.microsoft.com/azure/architecture/guide/responsible-innovation/responsible-ai'
	},
	autoML: {
		title: 'What is automated ML?',
		url: 'https://learn.microsoft.com/azure/machine-learning/concept-automated-ml'
	},
	supervisedUnsupervised: {
		title: 'Supervised vs unsupervised learning',
		url: 'https://learn.microsoft.com/training/modules/fundamentals-machine-learning/'
	},
	azureMLWhatIs: {
		title: 'What is Azure Machine Learning?',
		url: 'https://learn.microsoft.com/azure/machine-learning/overview-what-is-azure-machine-learning'
	},
	computeTargets: {
		title: 'Compute targets in Azure ML',
		url: 'https://learn.microsoft.com/azure/machine-learning/concept-compute-target'
	},
	trainValidateTest: {
		title: 'Train/validate/test split',
		url: 'https://learn.microsoft.com/azure/machine-learning/concept-train-validate-test'
	},
	overfitting: {
		title: 'Overfitting and model generalization',
		url: 'https://learn.microsoft.com/azure/machine-learning/concept-model-generalization-overfitting'
	},
	metrics: {
		title: 'Classification evaluation metrics',
		url: 'https://learn.microsoft.com/azure/machine-learning/concept-automated-ml#classification-metrics'
	},
	ocr: {
		title: 'Read API (OCR) in Computer Vision',
		url: 'https://learn.microsoft.com/azure/ai-services/computer-vision/overview-ocr'
	},
	customVision: {
		title: 'Custom Vision overview',
		url: 'https://learn.microsoft.com/azure/ai-services/custom-vision-service/overview'
	},
	faceApi: {
		title: 'Face service overview',
		url: 'https://learn.microsoft.com/azure/ai-services/face/overview'
	},
	imageAnalysis: {
		title: 'Image analysis',
		url: 'https://learn.microsoft.com/azure/ai-services/computer-vision/concept-image-analysis'
	},
	objectDetection: {
		title: 'Object detection with Custom Vision',
		url: 'https://learn.microsoft.com/azure/ai-services/custom-vision-service/object-detection-overview'
	},
	textAnalytics: {
		title: 'Text Analytics overview',
		url: 'https://learn.microsoft.com/azure/ai-services/language-service/overview'
	},
	sentiment: {
		title: 'Sentiment analysis overview',
		url: 'https://learn.microsoft.com/azure/ai-services/language-service/sentiment-opinion-mining/overview'
	},
	ner: {
		title: 'Named Entity Recognition',
		url: 'https://learn.microsoft.com/azure/ai-services/language-service/named-entity-recognition/overview'
	},
	pii: {
		title: 'PII detection',
		url: 'https://learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/overview'
	},
	languageDetection: {
		title: 'Language detection',
		url: 'https://learn.microsoft.com/azure/ai-services/language-service/language-detection/overview'
	},
	summarization: {
		title: 'Text summarization',
		url: 'https://learn.microsoft.com/azure/ai-services/language-service/summarization/overview'
	},
	speechToText: {
		title: 'Speech to text',
		url: 'https://learn.microsoft.com/azure/ai-services/speech-service/speech-to-text'
	},
	textToSpeech: {
		title: 'Text to speech',
		url: 'https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech'
	},
	speechTranslation: {
		title: 'Speech translation',
		url: 'https://learn.microsoft.com/azure/ai-services/speech-service/speech-translation'
	},
	languageStudio: {
		title: 'Language Studio',
		url: 'https://learn.microsoft.com/azure/ai-services/language-service/language-studio'
	},
	azureOpenAI: {
		title: 'What is Azure OpenAI Service?',
		url: 'https://learn.microsoft.com/azure/ai-services/openai/overview'
	},
	contentFiltering: {
		title: 'Azure AI content safety and filters',
		url: 'https://learn.microsoft.com/azure/ai-services/openai/concepts/content-filter'
	}
};

const variants = [
	'Which of the following',
	'Which option',
	'What',
	'Identify the best choice',
	'Select the correct answer',
	'Choose the statement',
	'Pick the option',
	'From the options below, which',
	'In this scenario, which',
	'Among these, which'
];

function vPrefix(i) {
	return variants[i % variants.length];
}

// Base templates across AI-900 blueprint
const baseTemplates = [
	{
		topic: 'ai-workloads',
		module: 'AI Concepts',
		category: 'AI Fundamentals',
		type: 'single',
		difficulty: 'easy',
		question: 'best describes supervised learning?',
		options: ['Learning from labeled examples to predict outcomes', 'Learning by trial and error via rewards', 'Discovering patterns in unlabeled data', 'Translating text between languages'],
		correct: 0,
		explanation: 'Supervised learning uses labeled datasets to learn input-output mappings for classification or regression.',
		reasonWrong: [
			'Reinforcement learning uses rewards and actions, not labeled pairs.',
			'Unsupervised learning finds structure without labels such as clusters.',
			'Translation is a task leveraging language models, not a learning paradigm.'
		],
		reference: refs.supervisedUnsupervised
	},
	{
		topic: 'ai-workloads',
		module: 'Responsible AI',
		category: 'Responsible AI',
		type: 'single',
		difficulty: 'easy',
		question: 'Responsible AI principle focuses on ensuring systems work as intended and can be trusted?',
		options: ['Fairness', 'Reliability and safety', 'Inclusiveness', 'Transparency'],
		correct: 1,
		explanation: 'Reliability and safety ensure AI systems perform as expected and fail gracefully.',
		reasonWrong: [
			'Fairness addresses bias and equitable outcomes.',
			'Inclusiveness focuses on accessibility and broad participation.',
			'Transparency emphasizes explainability and disclosure.'
		],
		reference: refs.responsibleAI
	},
	{
		topic: 'machine-learning',
		module: 'Azure Machine Learning',
		category: 'ML Concepts',
		type: 'single',
		difficulty: 'easy',
		question: 'type of machine learning predicts a continuous value?',
		options: ['Classification', 'Regression', 'Clustering', 'Reinforcement learning'],
		correct: 1,
		explanation: 'Regression predicts continuous numeric values.',
		reasonWrong: [
			'Classification predicts discrete categories, not continuous values.',
			'Clustering groups unlabeled data into clusters.',
			'Reinforcement learning optimizes actions via rewards.'
		],
		reference: refs.supervisedUnsupervised
	},
	{
		topic: 'machine-learning',
		module: 'Automated ML',
		category: 'Azure ML',
		type: 'single',
		difficulty: 'medium',
		question: 'is the primary benefit of Automated ML (AutoML) in Azure ML?',
		options: ['Building data lakes', 'Selecting algorithms and tuning hyperparameters', 'Deploying Kubernetes clusters', 'Designing user interfaces'],
		correct: 1,
		explanation: 'AutoML automates model selection and hyperparameter tuning for supported tasks.',
		reasonWrong: [
			'Data lakes concern storage architectures, not AutoML.',
			'Cluster deployment is infrastructure, not model selection.',
			'UI design is unrelated to Azure ML.'
		],
		reference: refs.autoML
	},
	{
		topic: 'machine-learning',
		module: 'Azure Machine Learning',
		category: 'ML Operations',
		type: 'single',
		difficulty: 'medium',
		question: 'is the main purpose of a compute cluster in Azure ML?',
		options: ['Serve as a data labeling tool', 'Provide scalable compute for training and batch inference', 'Host a website', 'Manage Azure DevOps pipelines'],
		correct: 1,
		explanation: 'Compute clusters scale nodes to run training and batch workloads efficiently.',
		reasonWrong: [
			'Labeling tools are separate; clusters run workloads.',
			'Web hosting is not Azure ML compute’s purpose.',
			'DevOps pipelines are separate from Azure ML compute.'
		],
		reference: refs.computeTargets
	},
	{
		topic: 'machine-learning',
		module: 'Azure Machine Learning',
		category: 'ML Concepts',
		type: 'single',
		difficulty: 'medium',
		question: 'dataset split helps tune models and prevent overfitting before final testing?',
		options: ['Training set', 'Validation set', 'Test set', 'Production logs'],
		correct: 1,
		explanation: 'Validation sets guide hyperparameter tuning prior to final test evaluation.',
		reasonWrong: [
			'The training set is used to fit parameters.',
			'The test set is for final unbiased evaluation.',
			'Logs are operational, not for training.'
		],
		reference: refs.trainValidateTest
	},
	{
		topic: 'machine-learning',
		module: 'Azure Machine Learning',
		category: 'ML Concepts',
		type: 'single',
		difficulty: 'medium',
		question: 'practice helps reduce overfitting and improve generalization?',
		options: ['Using an excessively complex model', 'Applying regularization and cross-validation', 'Merging train and test sets', 'Training on noisy labels intentionally'],
		correct: 1,
		explanation: 'Regularization and cross-validation reduce overfitting and improve generalization.',
		reasonWrong: [
			'Increasing complexity often worsens overfitting.',
			'Merging train/test causes data leakage.',
			'Noisy labels degrade model quality.'
		],
		reference: refs.overfitting
	},
	{
		topic: 'machine-learning',
		module: 'Azure Machine Learning',
		category: 'ML Concepts',
		type: 'multiple',
		difficulty: 'difficult',
		question: 'evaluation metrics are most appropriate to assess an imbalanced binary classifier? (Choose two)',
		options: ['Precision', 'Recall', 'Accuracy', 'RMSE'],
		correct: [0, 1],
		explanation: 'Precision and recall are robust for imbalance; accuracy can be misleading; RMSE is for regression.',
		reasonWrong: [
			'Accuracy is often inflated on imbalanced data.',
			'RMSE is not used for classification tasks.'
		],
		reference: refs.metrics
	},
	{
		topic: 'ai-workloads',
		module: 'AI Concepts',
		category: 'AI Fundamentals',
		type: 'single',
		difficulty: 'easy',
		question: 'scenario best represents a typical machine learning prediction task?',
		options: ['Transcribing live speech to text', 'Grouping unlabeled customers by behavior', 'Predicting next month’s sales based on history', 'Translating text from English to Spanish'],
		correct: 2,
		explanation: 'Predicting a future numeric value based on historical data is a classical ML task.',
		reasonWrong: [
			'Speech-to-text is a speech service capability.',
			'Clustering is unsupervised grouping without a predictive target.',
			'Translation is a language service capability.'
		],
		reference: refs.azureMLWhatIs
	},
	{
		topic: 'computer-vision',
		module: 'Computer Vision',
		category: 'Vision Services',
		type: 'single',
		difficulty: 'easy',
		question: 'Azure AI service extracts printed or handwritten text from images and documents?',
		options: ['Custom Vision', 'Read (OCR) in Computer Vision', 'Face API', 'Azure AI Search'],
		correct: 1,
		explanation: 'The Read OCR capability extracts text from images and PDFs.',
		reasonWrong: [
			'Custom Vision trains custom image classifiers/detectors, not OCR.',
			'Face API detects/analyzes faces, not text.',
			'Azure AI Search indexes content; it does not perform OCR.'
		],
		reference: refs.ocr
	},
	{
		topic: 'computer-vision',
		module: 'Custom Vision',
		category: 'Vision Services',
		type: 'single',
		difficulty: 'medium',
		question: 'should you choose Custom Vision over prebuilt Computer Vision models?',
		options: ['For generic object detection supported by prebuilt models', 'For domain-specific objects not covered by prebuilt models', 'For pure OCR tasks', 'For face verification only'],
		correct: 1,
		explanation: 'Custom Vision is for training domain-specific classifiers or detectors using labeled images.',
		reasonWrong: [
			'Prebuilt models often cover generic objects.',
			'OCR is a Computer Vision capability, not Custom Vision’s focus.',
			'Face verification is handled by Face API.'
		],
		reference: refs.customVision
	},
	{
		topic: 'computer-vision',
		module: 'Face API',
		category: 'Vision Services',
		type: 'single',
		difficulty: 'medium',
		question: 'capability is provided by Face API?',
		options: ['Pose estimation of full body', 'Face detection and attributes', '3D object reconstruction', 'Optical character recognition'],
		correct: 1,
		explanation: 'Face API detects faces and can return attributes such as emotion and landmarks.',
		reasonWrong: [
			'Pose estimation is not the Face API’s focus at AI-900 level.',
			'3D reconstruction is not part of Face API.',
			'OCR is a Computer Vision Read capability.'
		],
		reference: refs.faceApi
	},
	{
		topic: 'computer-vision',
		module: 'Computer Vision',
		category: 'Vision Services',
		type: 'single',
		difficulty: 'medium',
		question: 'feature detects objects and returns bounding boxes and labels?',
		options: ['Image captioning', 'OCR', 'Object detection', 'Face identification'],
		correct: 2,
		explanation: 'Object detection returns coordinates and class labels for detected instances.',
		reasonWrong: [
			'Captioning describes an image, not bounding boxes.',
			'OCR extracts text.',
			'Face identification is face-specific, not general object detection.'
		],
		reference: refs.objectDetection
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'single',
		difficulty: 'easy',
		question: 'Text Analytics feature identifies the overall tone of a document?',
		options: ['Key phrase extraction', 'Sentiment analysis', 'Entity recognition', 'Language detection'],
		correct: 1,
		explanation: 'Sentiment analysis classifies text as positive, negative, mixed, or neutral.',
		reasonWrong: [
			'Key phrases surface important terms, not sentiment.',
			'NER extracts entities such as people and organizations.',
			'Language detection identifies the language, not sentiment.'
		],
		reference: refs.sentiment
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'multiple',
		difficulty: 'medium',
		question: 'capabilities are provided by Text Analytics? (Choose two)',
		options: ['Sentiment analysis', 'Entity recognition', 'Speech synthesis', 'Form recognition'],
		correct: [0, 1],
		explanation: 'Text Analytics includes sentiment and NER among other capabilities.',
		reasonWrong: [
			'Speech synthesis belongs to Speech services, not Text Analytics.',
			'Form recognition belongs to Document Intelligence.'
		],
		reference: refs.textAnalytics
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'single',
		difficulty: 'medium',
		question: 'capability extracts names of people, organizations, and locations from text?',
		options: ['Sentiment analysis', 'Entity recognition', 'Topic modeling', 'Key phrase extraction'],
		correct: 1,
		explanation: 'NER identifies and classifies named entities in text.',
		reasonWrong: [
			'Sentiment focuses on polarity, not entities.',
			'Topic modeling is different and not a specific API in this context.',
			'Key phrases are important terms, not entities.'
		],
		reference: refs.ner
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'single',
		difficulty: 'medium',
		question: 'feature redacts sensitive information such as credit card numbers and phone numbers?',
		options: ['Key phrase extraction', 'PII detection', 'Entity linking', 'QnA Maker'],
		correct: 1,
		explanation: 'PII detection identifies and optionally redacts sensitive entities in text.',
		reasonWrong: [
			'Key phrases extract salient terms, not necessarily sensitive data.',
			'Entity linking connects entities to knowledge bases but is not focused on PII.',
			'QnA Maker is a question answering service (now part of Language Service).'
		],
		reference: refs.pii
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'single',
		difficulty: 'easy',
		question: 'feature identifies the language of a text document?',
		options: ['Sentiment analysis', 'Language detection', 'Entity recognition', 'Text summarization'],
		correct: 1,
		explanation: 'Language detection predicts the primary language of input text.',
		reasonWrong: [
			'Sentiment predicts tone, not language.',
			'NER extracts entities.',
			'Summarization condenses content.'
		],
		reference: refs.languageDetection
	},
	{
		topic: 'nlp',
		module: 'Language Studio',
		category: 'Language Services',
		type: 'single',
		difficulty: 'easy',
		question: 'is Language Studio primarily used for?',
		options: ['Building and testing language capabilities via a web portal', 'Managing AKS clusters', 'Authoring Power Apps', 'Monitoring virtual machines'],
		correct: 0,
		explanation: 'Language Studio is a web portal for trying and evaluating language features.',
		reasonWrong: [
			'AKS is managed via Azure portal/CLI.',
			'Power Apps is a low-code platform.',
			'VM monitoring uses Azure Monitor.'
		],
		reference: refs.languageStudio
	},
	{
		topic: 'nlp',
		module: 'Speech Services',
		category: 'Speech',
		type: 'single',
		difficulty: 'medium',
		question: 'Speech service feature converts spoken audio to text in real time?',
		options: ['Speech synthesis', 'Speech translation', 'Speech-to-text (recognition)', 'Custom neural voice'],
		correct: 2,
		explanation: 'Speech-to-text converts audio into text in near real time.',
		reasonWrong: [
			'Synthesis converts text to speech.',
			'Translation converts speech between languages, not just transcription.',
			'Custom Neural Voice is for TTS voice creation.'
		],
		reference: refs.speechToText
	},
	{
		topic: 'nlp',
		module: 'Speech Services',
		category: 'Speech',
		type: 'single',
		difficulty: 'medium',
		question: 'capability converts text to natural-sounding speech?',
		options: ['Speech-to-text', 'Speech translation', 'Text-to-speech (synthesis)', 'Entity recognition'],
		correct: 2,
		explanation: 'Text-to-speech converts text to audio using neural voices.',
		reasonWrong: [
			'Speech-to-text transcribes audio to text.',
			'Translation converts across languages.',
			'NER is an NLP text capability.'
		],
		reference: refs.textToSpeech
	},
	{
		topic: 'nlp',
		module: 'Speech Services',
		category: 'Speech',
		type: 'single',
		difficulty: 'difficult',
		question: 'approach lowers latency for real-time transcription?',
		options: ['Batch transcription', 'Streaming speech-to-text using WebSockets', 'Asynchronous job submission', 'Emailing audio files'],
		correct: 1,
		explanation: 'Streaming APIs deliver partial and final results with low latency.',
		reasonWrong: [
			'Batch is for offline processing.',
			'Async jobs incur higher latency and are not real-time.',
			'Email is not a valid interface for transcription.'
		],
		reference: refs.speechToText
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'single',
		difficulty: 'medium',
		question: 'capability condenses long documents into concise summaries?',
		options: ['Language detection', 'Text summarization', 'Key phrase extraction', 'Entity recognition'],
		correct: 1,
		explanation: 'Summarization condenses content to a shorter form preserving key ideas.',
		reasonWrong: [
			'Language detection identifies language, not content reduction.',
			'Key phrases extract terms but do not summarize.',
			'NER extracts entities, not summaries.'
		],
		reference: refs.summarization
	},
	{
		topic: 'ai-workloads',
		module: 'Responsible AI',
		category: 'Responsible AI',
		type: 'single',
		difficulty: 'medium',
		question: 'practice helps mitigate bias in training data?',
		options: ['Collect data from a single demographic', 'Audit datasets for representation and labeling quality', 'Randomly drop records without analysis', 'Merge training and test datasets'],
		correct: 1,
		explanation: 'Bias mitigation starts with representative, well-labeled datasets audited for quality.',
		reasonWrong: [
			'Single-demographic data increases bias risk.',
			'Random dropping may worsen bias.',
			'Merging sets causes leakage and invalid evaluation.'
		],
		reference: refs.responsibleAI
	},
	{
		topic: 'ai-workloads',
		module: 'AI Concepts',
		category: 'AI Fundamentals',
		type: 'single',
		difficulty: 'easy',
		question: 'term describes the input variables used by a model to make predictions?',
		options: ['Label', 'Feature', 'Inference', 'Endpoint'],
		correct: 1,
		explanation: 'Features are the input variables; labels are the target outputs in supervised learning.',
		reasonWrong: [
			'Label is the target output.',
			'Inference is the act of making predictions.',
			'Endpoint is a deployment artifact.'
		],
		reference: refs.supervisedUnsupervised
	},
	{
		topic: 'ai-workloads',
		module: 'AI Concepts',
		category: 'AI Fundamentals',
		type: 'single',
		difficulty: 'medium',
		question: 'learning paradigm optimizes actions through rewards and penalties?',
		options: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Transfer learning'],
		correct: 2,
		explanation: 'Reinforcement learning trains agents via reward signals to learn optimal policies.',
		reasonWrong: [
			'Supervised uses labeled examples.',
			'Unsupervised discovers patterns without labels.',
			'Transfer learning reuses knowledge from related tasks.'
		],
		reference: refs.supervisedUnsupervised
	},
	{
		topic: 'ai-workloads',
		module: 'AI Concepts',
		category: 'AI Fundamentals',
		type: 'single',
		difficulty: 'medium',
		question: 'split is used for the final unbiased evaluation of a trained model?',
		options: ['Training set', 'Validation set', 'Test set', 'Exploratory set'],
		correct: 2,
		explanation: 'The test set is strictly held out for final performance estimation.',
		reasonWrong: [
			'Training is used for fitting the model.',
			'Validation is used for tuning.',
			'Exploratory set is not a standard split.'
		],
		reference: refs.trainValidateTest
	},
	{
		topic: 'computer-vision',
		module: 'Computer Vision',
		category: 'Vision Services',
		type: 'single',
		difficulty: 'easy',
		question: 'feature generates a natural-language description of an image?',
		options: ['OCR', 'Image captioning', 'Face identification', 'Brand detection'],
		correct: 1,
		explanation: 'Image captioning describes images in natural language.',
		reasonWrong: [
			'OCR extracts text from images.',
			'Face identification focuses on faces.',
			'Brand detection recognizes logos/brands.'
		],
		reference: refs.imageAnalysis
	},
	{
		topic: 'computer-vision',
		module: 'Custom Vision',
		category: 'Vision Services',
		type: 'single',
		difficulty: 'difficult',
		question: 'practice improves a Custom Vision classifier’s generalization?',
		options: ['Use only images with the same background', 'Collect varied images per class across lighting and backgrounds', 'Train with as few images as possible', 'Use only synthetic images'],
		correct: 1,
		explanation: 'Diverse, representative images per class improve robustness and reduce overfitting.',
		reasonWrong: [
			'Uniform backgrounds reduce generalization.',
			'Very small datasets risk overfitting.',
			'Synthetic data helps but should complement real data.'
		],
		reference: refs.customVision
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'single',
		difficulty: 'medium',
		question: 'service would you choose to detect and redact sensitive information in documents?',
		options: ['Azure OpenAI', 'PII detection in Text Analytics', 'Custom Vision', 'Face API'],
		correct: 1,
		explanation: 'PII detection identifies sensitive entities such as credit card numbers or phone numbers.',
		reasonWrong: [
			'Azure OpenAI provides generative models but not built-in PII detection for text analytics pipelines.',
			'Custom Vision is for images.',
			'Face API is for faces in images and video.'
		],
		reference: refs.pii
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'single',
		difficulty: 'medium',
		question: 'capability identifies the key topics or important terms within a document?',
		options: ['Key phrase extraction', 'Language detection', 'Entity recognition', 'Speech recognition'],
		correct: 0,
		explanation: 'Key phrase extraction surfaces important terms.',
		reasonWrong: [
			'Language detection identifies language.',
			'NER extracts named entities, not arbitrary key phrases.',
			'Speech recognition is speech-to-text, not text analytics.'
		],
		reference: refs.textAnalytics
	},
	{
		topic: 'ai-workloads',
		module: 'Responsible AI',
		category: 'Responsible AI',
		type: 'single',
		difficulty: 'difficult',
		question: 'approach best supports transparency for an AI system making eligibility decisions?',
		options: ['Do not disclose model details', 'Provide user-facing explanations and documentation of limitations', 'Enable black-box optimization', 'Collect less data'],
		correct: 1,
		explanation: 'Transparency requires communicating how decisions are made, limitations, and user recourse.',
		reasonWrong: [
			'Withholding details reduces transparency.',
			'Black-box optimization increases opacity.',
			'Data minimization is privacy-related, not transparency.'
		],
		reference: refs.responsibleAI
	},
	{
		topic: 'ai-workloads',
		module: 'AI Concepts',
		category: 'AI Fundamentals',
		type: 'single',
		difficulty: 'easy',
		question: 'term describes the target value the model is trained to predict?',
		options: ['Label', 'Feature', 'Noise', 'Baseline'],
		correct: 0,
		explanation: 'The label is the ground truth output in supervised learning.',
		reasonWrong: [
			'Features are inputs.',
			'Noise refers to random variation in data.',
			'Baseline is a simple reference model.'
		],
		reference: refs.supervisedUnsupervised
	},
	{
		topic: 'machine-learning',
		module: 'Automated ML',
		category: 'Azure ML',
		type: 'single',
		difficulty: 'difficult',
		question: 'tasks are supported by Azure Automated ML?',
		options: ['Classification, regression, and time-series forecasting', 'Clustering and dimensionality reduction', 'Reinforcement learning', 'Neural architecture search for NLP'],
		correct: 0,
		explanation: 'AutoML supports supervised tasks and forecasting.',
		reasonWrong: [
			'Unsupervised tasks like clustering are not primary AutoML targets.',
			'Reinforcement learning is not supported by Azure AutoML.',
			'NAS for NLP is not an AutoML capability.'
		],
		reference: refs.autoML
	},
	{
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Language Services',
		type: 'single',
		difficulty: 'easy',
		question: 'service would you use to determine the language of a short chat message?',
		options: ['Language detection', 'Entity recognition', 'Sentiment analysis', 'Speech-to-text'],
		correct: 0,
		explanation: 'Language detection predicts the language of a text sample.',
		reasonWrong: [
			'NER extracts entities.',
			'Sentiment predicts tone, not language.',
			'Speech-to-text transcribes audio.'
		],
		reference: refs.languageDetection
	},
	{
		topic: 'ai-workloads',
		module: 'AI Concepts',
		category: 'AI Fundamentals',
		type: 'single',
		difficulty: 'medium',
		question: 'Azure service provides access to GPT family models for text generation and chat?',
		options: ['Azure OpenAI Service', 'Text Analytics', 'Language Understanding (LUIS)', 'Custom Vision'],
		correct: 0,
		explanation: 'Azure OpenAI provides access to large language models such as GPT and embeddings.',
		reasonWrong: [
			'Text Analytics provides classical NLP analysis, not generative models.',
			'LUIS is retired and replaced by Conversational Language Understanding.',
			'Custom Vision is for images, not text generation.'
		],
		reference: refs.azureOpenAI
	},
	{
		topic: 'ai-workloads',
		module: 'Responsible AI',
		category: 'Responsible AI',
		type: 'single',
		difficulty: 'medium',
		question: 'policy helps prevent harmful content when using Azure OpenAI models?',
		options: ['Disable logging', 'Content filtering and safety system messages', 'Increase token limit', 'Use larger model size only'],
		correct: 1,
		explanation: 'Content filters, safety parameters, and guidance mitigate harmful outputs.',
		reasonWrong: [
			'Disabling logs does not improve safety.',
			'Token limit is unrelated to safety.',
			'Model size alone does not ensure safety.'
		],
		reference: refs.contentFiltering
	}
];

function buildQuestionFromTemplate(template, id, variantIndex) {
	const questionPrefix = vPrefix(variantIndex);
	const questionText = `${questionPrefix} ${template.question}`.replace(/\s+/g, ' ').trim().replace(/\?\?$/, '?');

	const isMultiple = template.type === 'multiple';

	// Build reasoning.why_others_wrong map based on wrong options indices.
	const why = {};
	const correctIndices = Array.isArray(template.correct) ? template.correct : [template.correct];
	for (let i = 0; i < template.options.length; i++) {
		if (!correctIndices.includes(i)) {
			const idxForReason = Math.min(i, (template.reasonWrong.length - 1));
			why[String(i)] = template.reasonWrong[idxForReason] || 'This option does not address the requirement stated in the question.';
		}
	}

	return {
		id,
		topic: template.topic,
		module: template.module,
		category: template.category,
		type: template.type,
		difficulty: template.difficulty,
		question: questionText,
		options: template.options,
		correct: template.correct,
		explanation: template.explanation,
		reasoning: {
			correct: template.explanation,
			why_others_wrong: why
		},
		reference: template.reference
	};
}

function generateAi900Questions(total) {
	const questions = [];
	let idCounter = 1;
	let variantIndex = 0;
	while (questions.length < total) {
		for (const tpl of baseTemplates) {
			if (questions.length >= total) break;
			questions.push(buildQuestionFromTemplate(tpl, idCounter++, variantIndex));
			variantIndex++;
		}
	}
	return questions;
}

function buildAi900Exam() {
	return {
		id: 'ai-900',
		title: 'AI-900 Azure AI Fundamentals Practice Exam',
		description: 'Microsoft Certified: Azure AI Fundamentals',
		totalQuestions: 1000,
		topics: [
			{ id: 'ai-workloads', name: 'Describe Artificial Intelligence workloads and considerations', modules: ['AI Concepts', 'Responsible AI'] },
			{ id: 'machine-learning', name: 'Describe fundamental principles of machine learning on Azure', modules: ['Azure Machine Learning', 'Automated ML'] },
			{ id: 'computer-vision', name: 'Describe features of computer vision workloads on Azure', modules: ['Computer Vision', 'Custom Vision', 'Face API'] },
			{ id: 'nlp', name: 'Describe features of Natural Language Processing workloads on Azure', modules: ['Text Analytics', 'Language Studio', 'Speech Services'] }
		],
		questions: generateAi900Questions(1000)
	};
}

function main() {
	const data = loadJson(DATA_PATH);
	if (!data.exams || typeof data.exams !== 'object') {
		throw new Error('Invalid exams.json structure: missing exams object');
	}

	const ai900 = buildAi900Exam();
	data.exams['ai-900'] = ai900;

	// Save back preserving two-space indentation
	saveJson(DATA_PATH, data);
	console.log('AI-900 exam updated with 1000 questions.');
}

if (require.main === module) {
	main();
}