// dashboard/src/pages/AnalysisPage.tsx - DARK THEME + ERROR HANDLING MERGED

import React, { useState, useEffect } from 'react';
import { useMailchain } from '../hooks/useMailchain';
import { useAnalyzer } from '../hooks/useAnalyzer';
import { useSolana } from '../hooks/useSolana';
import { ThreatLevel, EventType } from '@analyzer/detector';

interface SubmissionError {
  email: string;
  error: string;
}

export const AnalysisPage: React.FC = () => {
  const { emails } = useMailchain();
  const { analyzeEmail, generateProof } = useAnalyzer();
  const { submitProof, connected, publicKey, connect } = useSolana();
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionErrors, setSubmissionErrors] = useState<SubmissionError[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    safe: 0,
    threats: 0,
    byLevel: {
      [ThreatLevel.Critical]: 0,
      [ThreatLevel.High]: 0,
      [ThreatLevel.Medium]: 0,
      [ThreatLevel.Low]: 0,
      [ThreatLevel.Safe]: 0,
    },
    byType: {
      [EventType.Phishing]: 0,
      [EventType.Spam]: 0,
      [EventType.Malware]: 0,
      [EventType.SocialEngineering]: 0,
    },
  });

  useEffect(() => {
    console.log('💰 Wallet State:', { connected, publicKey });
  }, [connected, publicKey]);

  useEffect(() => {
    const analyzeAll = async () => {
      if (emails.length === 0) return;
      setAnalyzing(true);

      const stats = {
        total: emails.length,
        safe: 0,
        threats: 0,
        byLevel: {
          [ThreatLevel.Critical]: 0,
          [ThreatLevel.High]: 0,
          [ThreatLevel.Medium]: 0,
          [ThreatLevel.Low]: 0,
          [ThreatLevel.Safe]: 0,
        },
        byType: {
          [EventType.Phishing]: 0,
          [EventType.Spam]: 0,
          [EventType.Malware]: 0,
          [EventType.SocialEngineering]: 0,
        },
      };

      for (const email of emails) {
        const analysis = await analyzeEmail(email);
        if (analysis.isMalicious) {
          stats.threats++;
          stats.byLevel[analysis.threatLevel]++;
          stats.byType[analysis.eventType]++;
        } else {
          stats.safe++;
          stats.byLevel[ThreatLevel.Safe]++;
        }
      }

      setStatistics(stats);
      setAnalyzing(false);
    };

    analyzeAll();
  }, [emails, analyzeEmail]);

  const handleSubmitAllProofs = async () => {
    console.log('🔘 Submit button clicked');
    console.log('📊 Current state:', { connected, publicKey, threatsCount: statistics.threats });

    if (!connected || !publicKey) {
      console.warn('⚠️ Wallet not connected');
      alert('Please connect your wallet first');
      await connect();
      return;
    }

    if (statistics.threats === 0) {
      alert('No threats detected to submit');
      return;
    }

    setSubmitting(true);
    setSubmissionErrors([]);
    let submitted = 0;
    const errors: SubmissionError[] = [];

    console.log(`🚀 Starting to submit ${statistics.threats} proofs...`);

    for (const email of emails) {
      try {
        const analysis = await analyzeEmail(email);
        if (analysis.isMalicious) {
          console.log(`📧 Processing malicious email from: ${email.from}`);

          const proof = await generateProof(email, analysis);
          if (!proof) {
            const error = 'Failed to generate proof';
            console.error('❌', error);
            errors.push({ email: email.from, error });
            continue;
          }

          console.log('🔐 Proof generated successfully');
          console.log('📦 Proof details:', proof.publicInputs);

          try {
            const signature = await submitProof(proof);
            if (signature) {
              submitted++;
              console.log(`✅ Proof submitted! Signature: ${signature}`);
              console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
            } else {
              const error = 'No signature returned';
              console.error('❌', error);
              errors.push({ email: email.from, error });
            }
          } catch (submitError: any) {
            const error = submitError.message || 'Blockchain submission failed';
            console.error('❌ Submission error:', error);
            errors.push({ email: email.from, error });
          }
        }
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        console.error('❌ Error processing email:', errorMsg);
        errors.push({ email: email.from, error: errorMsg });
      }
    }

    setSubmitting(false);
    setSubmissionErrors(errors);

    if (errors.length === 0) {
      alert(`✅ Successfully submitted all ${submitted} proofs to blockchain!`);
    } else {
      console.log('⚠️ Submission errors:', errors);
    }

    console.log('📊 Submission complete:', { submitted, failed: errors.length });
  };

  const truncateAddress = (address: string) =>
    address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Threat Analysis Dashboard</h1>
            <p className="text-gray-400">
              Real-time email threat detection and blockchain proof submission
            </p>
          </div>

          {connected && publicKey && (
            <div className="bg-green-900 border-2 border-green-500 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 font-medium text-sm">
                  {truncateAddress(publicKey)}
                </span>
              </div>
            </div>
          )}
        </div>

        {analyzing && (
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-blue-200 font-medium">
                Analyzing {emails.length} emails...
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <div className="text-3xl mb-2">📧</div>
            <div className="text-3xl font-bold text-white">{statistics.total}</div>
            <div className="text-sm text-gray-400">Total Emails</div>
          </div>

          <div className="bg-green-900 rounded-lg shadow p-6 border-2 border-green-600">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-300">{statistics.safe}</div>
            <div className="text-sm text-green-400 font-medium">Safe Emails</div>
          </div>

          <div className="bg-red-900 rounded-lg shadow p-6 border-2 border-red-600">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-3xl font-bold text-red-300">{statistics.threats}</div>
            <div className="text-sm text-red-400 font-medium">Threats Detected</div>
          </div>

          <div className="bg-purple-900 rounded-lg shadow p-6 border-2 border-purple-600">
            <div className="text-3xl mb-2">🔐</div>
            <div className="text-3xl font-bold text-purple-300">
              {statistics.threats}
            </div>
            <div className="text-sm text-purple-400 font-medium">Proofs Ready</div>
          </div>
        </div>

        {/* Errors */}
        {submissionErrors.length > 0 && (
          <div className="bg-red-900 border-2 border-red-600 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
              ⚠️ Submission Errors ({submissionErrors.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {submissionErrors.map((err, idx) => (
                <div key={idx} className="bg-gray-800 rounded p-3 border border-red-700">
                  <div className="font-medium text-white text-sm mb-1">📧 {err.email}</div>
                  <div className="text-red-400 text-sm font-mono">{err.error}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-white mb-4">Actions</h3>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center">
              <button
                onClick={handleSubmitAllProofs}
                disabled={submitting || statistics.threats === 0 || !connected}
                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Submitting Proofs...</span>
                  </>
                ) : (
                  <>
                    <span>🔐</span>
                    <span>Submit {statistics.threats} Proofs to Blockchain</span>
                  </>
                )}
              </button>

              {!connected && (
                <button
                  onClick={connect}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            {!connected && (
              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
                <p className="text-yellow-300 text-sm">
                  ⚠️ Connect your Phantom wallet to submit proofs
                </p>
              </div>
            )}

            {connected && statistics.threats === 0 && (
              <div className="bg-blue-900 border border-blue-700 rounded-lg p-3">
                <p className="text-blue-300 text-sm">
                  ℹ️ No threats detected. All emails are safe!
                </p>
              </div>
            )}

            {connected && statistics.threats > 0 && !submitting && (
              <div className="bg-green-900 border border-green-700 rounded-lg p-3">
                <p className="text-green-300 text-sm">
                  ✅ Ready to submit {statistics.threats} proof(s) to Solana devnet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <details>
            <summary className="font-bold text-white cursor-pointer">
              🔍 Debug Information (click to expand)
            </summary>
            <div className="mt-4 space-y-2 font-mono text-sm text-gray-300">
              <div><strong>Connected:</strong> {connected ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Public Key:</strong> {publicKey || 'Not connected'}</div>
              <div><strong>Threats:</strong> {statistics.threats}</div>
              <div><strong>Errors:</strong> {submissionErrors.length}</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};
