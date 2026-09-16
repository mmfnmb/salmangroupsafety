import Link from "next/link";

export default function VendorApplicationThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-2xl">✅</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-900">Application submitted</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Our team will review your documents and categories. You can log in now to complete your profile — full
        access to job opportunities unlocks once your application is approved.
      </p>
      <Link href="/login" className="mt-4 text-sm text-blue-700">Log in to your vendor account</Link>
    </div>
  );
}
