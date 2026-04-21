import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './ChatWindow.module.css';

function renderWithCitations(children, publications = [], clinicalTrials = [], onCiteClick) {
  const allSources = [
    ...(publications || []),
    ...(clinicalTrials || [])
  ];

  if (typeof children === 'string') {
    const parts = children.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const source = allSources[index];
        if (source) {
          return React.createElement('a', {
            key: i,
            href: source.url || '#',
            target: '_blank',
            rel: 'noreferrer',
            onClick: (e) => {
              e.preventDefault();
              if (onCiteClick) onCiteClick(source, part);
            },
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              background: '#6c63ff',
              color: 'white',
              borderRadius: '50%',
              fontSize: '10px',
              fontWeight: '700',
              textDecoration: 'none',
              margin: '0 2px',
              verticalAlign: 'middle',
              cursor: 'pointer'
            }
          }, match[1]);
        }
      }
      return part;
    });
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        return React.createElement('span', { key: i },
          renderWithCitations(child, publications, clinicalTrials, onCiteClick)
        );
      }
      return child;
    });
  }

  return children;
}

function PublicationModal({ source, citedText, onClose }) {
  if (!source) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>

        <div className={styles.modalTitle}>{source.title}</div>

        <div className={styles.modalMeta}>
          {source.authors?.length > 0 && (
            <span className={styles.modalAuthors}>
              👤 {source.authors.slice(0, 3).join(', ')}
              {source.authors.length > 3 ? ' et al.' : ''}
            </span>
          )}
          {source.authors?.length > 0 && <span className={styles.modalDot}>·</span>}
          {source.year && (
            <span className={styles.modalYear}>📅 {source.year}</span>
          )}
          {source.source && (
            <>
              <span className={styles.modalDot}>·</span>
              <span className={`${styles.modalSourceBadge} ${source.source === 'PubMed' ? styles.pubmed : styles.openalex}`}>
                {source.source}
              </span>
            </>
          )}
        </div>

        {citedText && (
          <div className={styles.supportingClaim}>
            <div className={styles.supportingClaimLabel}>Supporting Claim</div>
            <div className={styles.supportingClaimText}>"{citedText}"</div>
          </div>
        )}
        
        {source.snippet && (
          <div className={styles.supportingClaim}>
            <div className={styles.supportingClaimLabel}>
              Supporting Snippet
            </div>
            <div className={styles.supportingClaimText}>
              "{source.snippet}"
            </div>
          </div>
        )}

        {source.abstract && (
          <>
            <div className={styles.modalAbstractLabel}>Abstract / Summary</div>
            <div className={styles.modalAbstract}>
              {source.abstract.substring(0, 1200)}
              {source.abstract.length > 1200 ? '...' : ''}
            </div>
          </>
        )}

        {source.url && (
          
          <a  href={source.url}
            target="_blank"
            rel="noreferrer"
            className={styles.modalUrl}
          >
            🔗 Read Full Paper →
          </a>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, isLoading, onFollowUp, onExampleClick }) {
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [citedText, setCitedText] = useState('');

  useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, isLoading]);

  const handleInputSend = () => {
    if (!inputValue.trim() || isLoading) return;
    onFollowUp(inputValue.trim());
    setInputValue('');
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSend();
    }
  };

  const handleCiteClick = (source, citation) => {
    setSelectedSource(source);
    setCitedText('');
  };

  const handlePubCardClick = (pub) => {
    setSelectedSource(pub);
    setCitedText('');
  };

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className={styles.window}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🧬</div>
          <h2>Welcome to Curalink</h2>
          <p>Your AI-powered medical research companion. Enter patient details and your question to get research-backed insights.</p>
          <div className={styles.tryLabel}>💬 Try these research questions:</div>
          <div className={styles.exampleGrid}>
            {[
              { icon: '🫁', text: 'Latest treatment options for lung cancer' },
              { icon: '🧠', text: 'Clinical trials for Alzheimer\'s disease' },
              { icon: '💉', text: 'Recent studies on diabetes prevention' },
              { icon: '❤️', text: 'Heart disease research and new therapies' },
              { icon: '🧬', text: 'Immunotherapy effectiveness for cancer' },
              { icon: '🦠', text: 'Latest COVID-19 long term effects research' },
              { icon: '💊', text: 'Deep brain stimulation for Parkinson\'s' },
              { icon: '🔬', text: 'CRISPR gene therapy latest studies' }
            ].map((ex, i) => (
              <div 
                   key={i} 
                   className={styles.exampleCard}
                   onClick={() => onExampleClick && onExampleClick(ex.text)}>
                <span>{ex.icon}</span>
                {ex.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main chat view
  return (
    <div className={styles.window}>
      {messages.map((msg, i) => (
        <div key={i}>
          {msg.type === 'user' && (
            <div className={styles.userBubble}>
              <div className={styles.userCard}>
                <div className={styles.userName}>{msg.patientName || 'Patient'}</div>
                <div className={styles.userDisease}>{msg.disease}</div>
                {msg.query && <div className={styles.userQuery}>{msg.query}</div>}
                {msg.location && (
                  <div className={styles.userMeta}>
                    <span className={styles.metaTag}>📍 {msg.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {msg.type === 'assistant' && (
            <div className={styles.assistantBubble}>
              <div className={styles.assistantHeader}>
                <div className={styles.assistantAvatar}>🔬</div>
                <span className={styles.assistantLabel}>Curalink Research</span>
                <span className={styles.assistantTime}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className={styles.responseCard}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p>{renderWithCitations(children, msg.publications, msg.clinicalTrials, handleCiteClick)}</p>
                    ),
                    li: ({ children }) => (
                      <li>{renderWithCitations(children, msg.publications, msg.clinicalTrials, handleCiteClick)}</li>
                    )
                  }}
                >
                  {msg.llmResponse}
                </ReactMarkdown>
              </div>

              <ActionBar response={msg.llmResponse} />

              {msg.totalFetched && (
                <div className={styles.statsBar}>
                  <span className={styles.statItem}>📊 Analyzed</span>
                  <span className={styles.statDivider}>·</span>
                  <span className={styles.statItem}>🔬 {msg.totalFetched.pubmed} PubMed</span>
                  <span className={styles.statDivider}>·</span>
                  <span className={styles.statItem}>📖 {msg.totalFetched.openAlex} OpenAlex</span>
                  <span className={styles.statDivider}>·</span>
                  <span className={styles.statItem}>🧪 {msg.totalFetched.clinicalTrials} Trials</span>
                </div>
              )}

              {msg.publications?.length > 0 && (
                <PublicationsSection
                  publications={msg.publications}
                  onCardClick={handlePubCardClick}
                />
              )}

              {msg.clinicalTrials?.length > 0 && (
                <TrialsSection
                  trials={msg.clinicalTrials}
                  title={`Clinical Trials for ${msg.disease || 'this condition'}`}
                  icon="🧪"
                />
              )}

              {msg.queryClinicalTrials?.length > 0 && (
                <TrialsSection
                  trials={msg.queryClinicalTrials}
                  title="Trials related to your question"
                  icon="💊"
                />
              )}

              {msg.followUpQuestions?.length > 0 && (
                <div className={styles.followUpSection}>
                  <div className={styles.followUpLabel}>💡 Suggested Follow-up Questions</div>
                  <div className={styles.followUpButtons}>
                    {msg.followUpQuestions.map((q, qi) => (
                      <button
                        key={qi}
                        className={styles.followUpBtn}
                        onClick={() => onFollowUp && onFollowUp(q)}
                        disabled={isLoading}
                      >
                        {qi + 1}. {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className={styles.loadingBubble}>
          <div style={{
            width: 32, height: 32, background: '#6c63ff',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, flexShrink: 0
          }}>🔬</div>
          <div className={styles.loadingCard}>
            <div className={styles.loadingText}>Searching research databases...</div>
            <div className={styles.dots}>
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      {/* INPUT BAR — always visible after first message */}
      {messages.length > 0 && (
        <div className={styles.inputBar}>
          <textarea
            className={styles.inputBarField}
            placeholder="Ask a follow-up question..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            className={styles.inputBarBtn}
            onClick={handleInputSend}
            disabled={isLoading || !inputValue.trim()}
          >
            ➤
          </button>
        </div>
      )}

      {selectedSource && (
        <PublicationModal
          source={selectedSource}
          citedText={citedText}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </div>
  );
}

function ActionBar({ response }) {
  const [liked, setLiked] = React.useState(false);
  const [disliked, setDisliked] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    setLiked(!liked);
    setDisliked(false);
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    setLiked(false);
  };

  return (
    <div className={styles.actionBar}>
      <button
        className={`${styles.actionBtn} ${copied ? styles.copied : ''}`}
        onClick={handleCopy}
        title="Copy response"
      >
        {copied ? '✓' : '⎘'}
      </button>
      <button
        className={styles.actionBtn}
        title="Share"
        onClick={() => navigator.clipboard.writeText(window.location.href)}
      >
        ⇧
      </button>
      <button
        className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
        onClick={handleLike}
        title="Helpful"
      >
        👍
      </button>
      <button
        className={`${styles.actionBtn} ${disliked ? styles.disliked : ''}`}
        onClick={handleDislike}
        title="Not helpful"
      >
        👎
      </button>
    </div>
  );
}

function PublicationsSection({ publications, onCardClick }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span>📚</span>
        <span className={styles.sectionTitle}>Research Publications</span>
        <span className={styles.sectionCount}>{publications.length}</span>
      </div>
      <div className={styles.pubGrid}>
        {publications.slice(0, 6).map((pub, i) => (
          <div
            key={i}
            className={`${styles.pubCard} ${styles.pubCardClickable}`}
            onClick={() => onCardClick(pub)}
          >
            <div className={styles.pubMeta}>
              <span className={`${styles.sourceBadge} ${pub.source === 'PubMed' ? styles.pubmed : styles.openalex}`}>
                {pub.source}
              </span>
              <span className={styles.yearBadge}>{pub.year}</span>
            </div>
            <div className={styles.pubTitle}>{pub.title}</div>
            {pub.authors?.length > 0 && (
              <div className={styles.pubAuthors}>
                👥 {pub.authors.slice(0, 2).join(', ')}
                {pub.authors.length > 2 ? ` +${pub.authors.length - 2} more` : ''}
              </div>
            )}
            <div className={styles.pubAbstract}>
              {pub.abstract?.substring(0, 160)}...
            </div>
            <span className={styles.readMore}>Click to view details →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrialsSection({ trials, title, icon }) {
  const getStatusClass = (status) => {
    if (status === 'RECRUITING') return styles.recruiting;
    if (status === 'COMPLETED') return styles.completed;
    return styles.active;
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span>{icon}</span>
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionCount}>{trials.length}</span>
      </div>
      <div className={styles.trialGrid}>
        {trials.slice(0, 3).map((trial, i) => (
          <div key={i} className={styles.trialCard}>
            <span className={`${styles.statusBadge} ${getStatusClass(trial.status)}`}>
              <span className={styles.statusDot} />
              {trial.status}
            </span>
            <div className={styles.trialTitle}>{trial.title}</div>
            {trial.locations && (
              <div className={styles.trialLocation}>📍 {trial.locations}</div>
            )}
            <div className={styles.trialDesc}>
              {trial.description?.substring(0, 160)}...
            </div>

          {trial.eligibility && (
            <div className={styles.trialEligibility}>
             📋 <strong>Eligibility:</strong> {trial.eligibility
                ?.replace(/\\</g, '<')
                ?.replace(/\\>/g, '>')
                ?.replace(/\\*/g, '')
                ?.substring(0, 250)}...
            </div>
          )}

          {trial.contact && trial.contact !== 'Not provided' && (
            <div className={styles.trialLocation}>
              📞 {trial.contact}
            </div>
          )}

            {trial.url && (
              <a href={trial.url} target="_blank" rel="noreferrer" className={styles.readMore}>
                View trial →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}