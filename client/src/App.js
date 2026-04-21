import { useState } from 'react';
import InputPanel from './components/InputPanel';
import ChatWindow from './components/ChatWindow';
import { sendResearchQuery } from './services/api';
import styles from './App.module.css';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [prefillQuestion, setPrefillQuestion] = useState('');
  const [showResults, setShowResults] = useState(false); // ← ADD THIS
  
  const handleExampleClick = (question) => {
  setPrefillQuestion(question);
  };

  const handleSubmit = async (formData) => {
    // Add user message to chat
    setMessages(prev => [...prev, {
  type: 'user',
  disease: formData.disease,
  query: formData.additionalQuery,
  patientName: formData.patientName,
  location: formData.location
}]);

    setIsLoading(true);
    setShowResults(true); // ← ADD THIS

    try {
      const response = await sendResearchQuery({
        ...formData,
        sessionId
      });

      // Save session ID for follow-up questions
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      // Add assistant response to chat
      setMessages(prev => [...prev, {
  type: 'assistant',
  llmResponse: response.llmResponse,
  publications: response.publications,
  clinicalTrials: response.clinicalTrials,
  queryClinicalTrials: response.queryClinicalTrials,  // add this
  disease: response.disease,                          // add this
  totalFetched: response.totalFetched,
  followUpQuestions: response.followUpQuestions || []
}]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'assistant',
        llmResponse: '## Error\nSomething went wrong. Please make sure the server is running and try again.',
        publications: [],
        clinicalTrials: []
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = (question) => {
    const lastUserMsg = messages.find(m => m.type === 'user');
    handleSubmit({
      patientName: lastUserMsg?.patientName || '',
      disease: lastUserMsg?.disease || '',
      additionalQuery: question,
      location: lastUserMsg?.location || '',
      sessionId
    });
  };

  return (
  <div className={styles.app}>
    <div className={`${styles.inputWrapper} ${showResults ? styles.inputHidden : ''}`}>
      <InputPanel
        onSubmit={handleSubmit}
        isLoading={isLoading}
        sessionId={sessionId}
        prefillQuestion={prefillQuestion}
        onPrefillUsed={() => setPrefillQuestion('')}
      />
    </div>

    <div className={`${styles.resultsWrapper} ${!showResults ? styles.resultsHidden : ''}`}>
      {showResults && (
        <button
          className={styles.backButton}
          onClick={() => setShowResults(false)}
        >
          ← Back to Search
        </button>
      )}
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        onFollowUp={handleFollowUp}
        onExampleClick={handleExampleClick}
      />
    </div>
  </div>
)};