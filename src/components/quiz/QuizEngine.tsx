"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bird } from "@/lib/types";
import { QUIZ_QUESTIONS, scoreQuiz } from "@/lib/quiz-scoring";

export default function QuizEngine({ birds }: { birds: Bird[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Bird[] | null>(null);

  const currentQ = QUIZ_QUESTIONS[step];
  const isLast = step === QUIZ_QUESTIONS.length - 1;

  function selectAnswer(value: string) {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (isLast) {
      setResults(scoreQuiz(newAnswers, birds));
    } else {
      setStep(step + 1);
    }
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setResults(null);
  }

  if (results) {
    return (
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h2 className="font-serif text-3xl text-forest mb-3">Your Perfect Matches</h2>
          <p className="text-espresso/70">Based on your answers, these birds might be perfect for you.</p>
        </motion.div>

        <div className="space-y-6">
          {results.slice(0, 3).map((bird, i) => (
            <motion.div
              key={bird.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <Link href={`/birds/${bird.slug}`} className="paper-card overflow-hidden flex flex-col sm:flex-row group">
                <div className="relative w-full sm:w-48 h-40 flex-shrink-0 overflow-hidden">
                  <Image src={bird.heroImage} alt={bird.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="192px" />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 px-2 py-1 bg-terracotta text-cream text-xs rounded-full font-semibold">
                      Best Match
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl text-forest group-hover:text-terracotta transition-colors">{bird.name}</h3>
                  <p className="text-olive text-sm italic mb-2">{bird.scientificName}</p>
                  <p className="text-espresso/70 text-sm line-clamp-2">{bird.description}</p>
                  <div className="flex gap-3 mt-2 text-xs text-olive">
                    <span>{bird.careLevel}</span>
                    <span>·</span>
                    <span>{bird.temperament}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button onClick={reset} className="ghost-button">Retake Quiz</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-olive mb-2">
          <span>Question {step + 1} of {QUIZ_QUESTIONS.length}</span>
          <span>{Math.round(((step) / QUIZ_QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-terracotta rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(step / QUIZ_QUESTIONS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-serif text-2xl md:text-3xl text-forest mb-8 text-center">
            {currentQ.question}
          </h2>

          <div className="space-y-3">
            {currentQ.options.map((option) => (
              <button
                key={option.value}
                onClick={() => selectAnswer(option.value)}
                className="w-full text-left p-5 paper-card hover:border-terracotta/30 hover:shadow-md transition-all group"
              >
                <span className="text-espresso group-hover:text-forest font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {step > 0 && (
        <button onClick={() => setStep(step - 1)} className="mt-6 text-olive hover:text-forest text-sm font-medium">
          ← Previous question
        </button>
      )}
    </div>
  );
}
