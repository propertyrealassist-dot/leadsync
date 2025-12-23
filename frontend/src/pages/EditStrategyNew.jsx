import { useState } from 'react';

export default function EditStrategyNew() {
  const [qualificationEnabled, setQualificationEnabled] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Initial Message Section */}
        <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💬 Initial Message</h3>
            <button className="text-[#34d399] hover:text-[#10b981] text-sm font-medium">
              + Add Template
            </button>
          </div>
          <textarea
            className="w-full h-24 bg-[#0a0e1a] border border-white/10 rounded-lg p-4 text-white resize-none focus:outline-none focus:border-[#34d399]/50"
            placeholder="Enter your initial message..."
          />
        </div>

        {/* Qualification Questions Section */}
        <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              ❓ Qualification Questions {qualificationEnabled ? '(ON)' : '(OFF)'}
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-400">Turn on qualifications</span>
              <input
                type="checkbox"
                checked={qualificationEnabled}
                onChange={(e) => setQualificationEnabled(e.target.checked)}
                className="w-10 h-6 bg-gray-600 rounded-full appearance-none cursor-pointer relative
                  checked:bg-[#34d399] transition-colors
                  after:content-[''] after:absolute after:top-1 after:left-1
                  after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform
                  checked:after:translate-x-4"
              />
            </label>
          </div>

          {!qualificationEnabled && (
            <p className="text-center text-gray-500 italic py-8">
              Qualification disabled
            </p>
          )}

          {qualificationEnabled && (
            <div className="space-y-3">
              {/* Example Question Card */}
              <div className="flex items-start gap-3 p-4 bg-[#0a0e1a] rounded-lg">
                <div className="text-gray-500 cursor-move">⋮⋮</div>
                <div className="flex-1">
                  <div className="font-medium">Q1: What is your biggest challenge?</div>
                  <div className="text-sm text-gray-400 mt-1">Condition: None</div>
                </div>
                <button className="text-red-400 hover:text-red-300">×</button>
              </div>
            </div>
          )}
        </div>

        {/* Follow Ups Section */}
        <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">📬 Follow Ups</h3>
              <span className="px-2 py-1 text-xs font-semibold bg-white/10 rounded-full">1</span>
            </div>
            <button className="text-[#34d399] hover:text-[#10b981] text-sm font-medium">
              + Add Template
            </button>
          </div>

          {/* Follow Up Card */}
          <div className="flex items-center gap-3 p-4 bg-[#0a0e1a] rounded-lg mb-3">
            <div className="text-gray-500 cursor-move">⋮⋮</div>
            <div className="font-bold text-gray-400">F1</div>
            <div className="flex-1 text-sm">
              Vuoi iniziare il percorso insieme a me o preferisci che blocchi tutto?
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Delay:</span>
              <input
                type="text"
                defaultValue="1d"
                className="w-16 px-2 py-1 bg-[#1a1f2e] border border-white/10 rounded text-center text-sm"
              />
            </div>
            <button className="text-red-400 hover:text-red-300">×</button>
          </div>

          {/* Add Follow Up Button */}
          <button className="w-full border-2 border-dashed border-white/20 rounded-lg py-4 text-[#34d399] hover:border-[#34d399]/50 hover:bg-[#34d399]/5 transition-colors">
            + Add Follow Up
          </button>
        </div>

      </div>
    </div>
  );
}
