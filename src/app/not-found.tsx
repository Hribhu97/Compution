import Link from "next/link";
import { Bird } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center section-padding">
      <div className="text-center">
        <Bird className="w-16 h-16 text-olive/40 mx-auto mb-6" aria-hidden="true" />
        <h1 className="font-serif text-5xl text-forest mb-4">404</h1>
        <p className="text-espresso/70 text-lg mb-8 max-w-md mx-auto">
          This page has flown the coop. The bird you&apos;re looking for might have migrated elsewhere.
        </p>
        <Link href="/" className="stamp-button">Return Home</Link>
      </div>
    </div>
  );
}
