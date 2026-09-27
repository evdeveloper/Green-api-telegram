import { LoginForm } from '@/features/auth/LoginForm';
import { ChatLayout } from '@/features/layout/ChatLayout';
import { AppStoreProvider } from '@/store/AppStore';
import { useAppState } from '@/store/hooks';

export default function App() {
  return (
    <AppStoreProvider>
      <Root />
    </AppStoreProvider>
  );
}

function Root() {
  const { session } = useAppState();
  return session.status === 'ready' ? <ChatLayout /> : <LoginForm />;
}
