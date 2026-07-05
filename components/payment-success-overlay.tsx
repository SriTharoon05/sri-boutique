'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface PaymentSuccessOverlayProps {
  show: boolean;
  onClose: () => void;
  orderNumber?: string;
}

export function PaymentSuccessOverlay({ show, onClose, orderNumber }: PaymentSuccessOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="mx-4 flex w-full max-w-sm flex-col items-center rounded-2xl bg-white px-8 py-10 text-center shadow-2xl"
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated circle + checkmark, drawn with stroke-dasharray */}
            <div className="relative mb-6 h-24 w-24">
              <svg viewBox="0 0 100 100" className="h-24 w-24">
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="6"
                  strokeLinecap="round"
                  pathLength={1}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.55, ease: 'easeInOut' }}
                />
                <motion.path
                  d="M30 52 L44 66 L70 36"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
                />
              </svg>
              {/* Soft pulse ring for extra polish */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-green-400"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.35, opacity: 0 }}
                transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
              />
            </div>

            <motion.h2
              className="font-display text-2xl font-semibold text-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.35 }}
            >
              Payment Successful
            </motion.h2>

            <motion.p
              className="mt-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.35 }}
            >
              {orderNumber
                ? `Your order ${orderNumber} has been placed.`
                : 'Your order has been placed.'}
            </motion.p>

            <motion.button
              onClick={onClose}
              className="mt-7 w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.35 }}
            >
              View Order
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}