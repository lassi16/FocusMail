import { AppShell } from "@/components/layout/AppShell";
import { ChatClient } from "@/components/chat/ChatClient";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ChatPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  return (
    <AppShell>
      <ChatClient initialQuery={q} />
    </AppShell>
  );
}
