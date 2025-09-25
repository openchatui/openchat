import SearchBar from "@/components/search/search-bar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatsResults from "@/components/search/results/chats-results";
import ModelsResults from "@/components/search/results/models-results";
import RecentChatsResults from "@/components/search/results/recent-chats-results";

interface SearchPageProps {
  searchParams?: Promise<{ q?: string | string[]; mention?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const sp = (await searchParams) ?? {};
  const rawQ = sp.q;
  const q = typeof rawQ === "string" ? rawQ : Array.isArray(rawQ) ? (rawQ[0] ?? "") : "";
  const rawMention = sp.mention;
  const mentions = Array.isArray(rawMention)
    ? rawMention.map((m) => String(m).toLowerCase())
    : rawMention
    ? [String(rawMention).toLowerCase()]
    : [];

  const mentionSet = new Set(mentions);
  const scopeChats = mentionSet.has("chats");
  const scopeArchived = mentionSet.has("archived");
  const scopeModels = mentionSet.has("models") || mentionSet.has("model");
  const scopeNoneSpecified = !scopeChats && !scopeArchived;

  if (q) {
    if (scopeModels) {
      return (
        <div className="mx-48 w-full px-2.5 py-3">
          <SearchBar query={q} initialMentions={mentions} className="max-w-[600px] mx-auto" />
          <ModelsResults userId={userId} query={q} mentions={mentions} />
        </div>
      );
    }
    return (
      <div className="mx-48 w-full px-2.5 py-3">
        <SearchBar query={q} initialMentions={mentions} className="max-w-[600px] mx-auto" />
        <ChatsResults userId={userId} query={q} mentions={mentions} />
      </div>
    );
  }

  // When no query: default to chats unless a mention switches scope
  if (!q) {
    if (scopeModels) {
      return (
        <div className="mx-48 w-full px-2.5 py-3">
          <SearchBar query={q} initialMentions={mentions} className="max-w-[600px] mx-auto" />
          <ModelsResults userId={userId} mentions={mentions} />
        </div>
      );
    }
    return (
      <div className="mx-48 w-full px-2.5 py-3">
        <SearchBar query={q} initialMentions={mentions} className="max-w-[600px] mx-auto" />
        <RecentChatsResults userId={userId} />
      </div>
    );
  }
  return null;
}

