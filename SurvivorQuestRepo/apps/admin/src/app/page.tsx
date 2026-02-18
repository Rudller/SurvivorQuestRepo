import Link from 'next/link';

export default function HomePage() {
  return (
    <main className='min-h-screen bg-zinc-50 p-8'>
      <div className='mx-auto max-w-3xl rounded-xl border bg-white p-6'>
        <h1 className='text-2xl font-semibold text-black'>SurvivorQuest Panel Administratora</h1>
        <p className='mt-2 text-zinc-600'>
          Panel administracyjny dla SurvivorQuest. Tutaj możesz zarządzać graczami, zadaniami i innymi aspektami gry. Aby rozpocząć, wybierz jedną z opcji poniżej:
        </p>

        <div className='mt-6 flex gap-3'>
          <Link
            href="/users"
            className='rounded-md bg-black px-4 py-2 text-white hover:opacity-90'
          >
            Użytkownicy
          </Link>
          <Link
            href="/login"
            className='rounded-md bg-black px-4 py-2 text-white hover:opacity-90'
          >
            Logowanie
          </Link>
        </div>
      </div>
    </main>
  )
}