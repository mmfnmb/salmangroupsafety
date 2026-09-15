import Link from "next/link";

export default function LeadThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-2xl">✅</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-900">Thanks — we&apos;ll be in touch shortly.</h1>
      <Link href="/" className="mt-4 text-sm text-blue-700">Back to home</Link>
    </div>
  );
}
