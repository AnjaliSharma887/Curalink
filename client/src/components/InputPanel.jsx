import { useState, useEffect } from 'react';
import styles from './InputPanel.module.css';


export default function InputPanel({ onSubmit, isLoading, sessionId, prefillQuestion, onPrefillUsed }) {
  const [form, setForm] = useState({
    patientName: '',
    disease: '',
    additionalQuery: '',
    location: ''
  });
  useEffect(() => {
  if (prefillQuestion) {
    setForm(prev => ({ ...prev, additionalQuery: prefillQuestion }));
    if (onPrefillUsed) onPrefillUsed();
  }
}, [prefillQuestion, onPrefillUsed]);
  
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.disease.trim()) {
      alert('Please enter a disease or condition');
      return;
    }
    if (!form.patientName.trim()) {
      alert('Please enter patient name');
      return;
    }
    if (!form.location.trim()) {
      alert('Please enter location');
      return;
    }
    onSubmit({ ...form, sessionId });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🔬</div>
          <span className={styles.logoText}>Curalink</span>
        </div>
        <p className={styles.tagline}>AI Medical Research Assistant</p>
      </div>

      <div className={styles.form}>
        <p className={styles.sectionLabel}>Patient Information</p>

        <div className={styles.field}>
          <label>Patient Name <span className={styles.required}>*</span></label>
          <input
            name="patientName"
            placeholder="e.g. John Smith"
            value={form.patientName}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label>Disease / Condition <span className={styles.required}>*</span></label>
          <input
            name="disease"
            placeholder="e.g. Parkinson's disease"
            value={form.disease}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label>Location <span className={styles.required}>*</span></label>
          <input
            name="location"
            placeholder="e.g. Delhi, India"
            value={form.location}
            onChange={handleChange}
          />
        </div>

        <div className={styles.divider} />

        <p className={styles.sectionLabel}>Research Query</p>

        <div className={styles.field}>
          <label>Your Question <span className={styles.required}>*</span></label>
          <textarea
            name="additionalQuery"
            placeholder="e.g. What are the latest treatment options? Can I take Vitamin D?"
            value={form.additionalQuery}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={4}
          />
        </div>

        {sessionId && (
          <div className={styles.sessionBadge}>
            <div className={styles.dot} />
            Session active — follow-up questions remember context
          </div>
        )}

        <button
          className={styles.button}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>🔄 Researching...</>
          ) : (
            <>🔍 Search Research</>
          )}
        </button>
      </div>

      <div className={styles.footer}>
        Powered by PubMed · OpenAlex · ClinicalTrials.gov
      </div>
    </div>
  );
}