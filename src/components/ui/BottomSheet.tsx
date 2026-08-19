"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-espresso/40 z-50 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto md:hidden"
            role="dialog"
            aria-label={title}
          >
            <div className="sticky top-0 bg-cream px-6 py-4 flex items-center justify-between border-b border-espresso/10">
              <h3 className="font-serif text-lg font-semibold text-forest">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="p-1 text-espresso/60 hover:text-espresso">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
