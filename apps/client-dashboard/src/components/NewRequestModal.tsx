"use client";
import React, { useState } from "react";
import { submitClientRequest } from "../app/portal-actions";
import { X, Paperclip, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewRequestModal({
  projectId,
  onClose,
}: {
  projectId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Select an area");
  const [priority, setPriority] = useState<
    "Standard" | "Priority" | "Critical"
  >("Standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // You can expand your server action to accept category & priority if you update your schema
      const res = await submitClientRequest(projectId, title, description);

      if (res.success) {
        router.refresh(); // Force Next.js to re-fetch Server Components (like the Dashboard)
        onClose();
      } else {
        setError(res.error || "Failed to submit request.");
      }
    } catch (err) {
      setError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06070b]/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#0b1326] border border-[#212d4a] rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e364a7] via-[#d050c2] to-[#4361ee]" />

        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-white mb-1">
                Initiate New Request
              </h2>
              <p className="text-sm text-[#958ea0]">
                Define the scope and priority for your next feature or update.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-[#958ea0] hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#dae2fd] mb-2">
                Request Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., Implement dark mode toggle"
                className="w-full bg-[#131b2e] border border-[#212d4a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#d050c2] transition-colors disabled:opacity-50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#dae2fd] mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#131b2e] border border-[#212d4a] rounded-lg px-4 py-3 text-sm text-[#958ea0] focus:outline-none focus:border-[#d050c2] appearance-none disabled:opacity-50"
                >
                  <option disabled>Select an area</option>
                  <option>Frontend Design</option>
                  <option>Backend Systems</option>
                  <option>API Integration</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#dae2fd] mb-2">
                  Priority Level
                </label>
                <div className="flex bg-[#131b2e] border border-[#212d4a] rounded-lg p-1 h-[46px]">
                  {(["Standard", "Priority", "Critical"] as const).map(
                    (level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setPriority(level)}
                        disabled={isSubmitting}
                        className={`flex-1 text-xs font-semibold rounded-md transition-all ${
                          priority === level
                            ? "bg-[#212d4a] text-white shadow-sm"
                            : "text-[#958ea0] hover:text-white"
                        }`}
                      >
                        {level}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#dae2fd] mb-2">
                Brief Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Provide context, constraints, and expected outcomes..."
                className="w-full bg-[#131b2e] border border-[#212d4a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#d050c2] transition-colors min-h-[120px] resize-none disabled:opacity-50"
                required
              />
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#171f33]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold text-[#dae2fd] hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#d050c2] to-[#e364a7] hover:brightness-110 shadow-lg shadow-[#d050c2]/20 transition-all disabled:opacity-50 disabled:hover:brightness-100 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
