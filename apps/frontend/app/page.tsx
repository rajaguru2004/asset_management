import { redirect } from 'next/navigation';

export default function Home() {
  // The (admin) layout bounces unauthenticated users to /login.
  redirect('/dashboard');
}
