import SearchBar from "@/components/search/search-bar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatsResults from "@/components/search/results/chats-results";
import ModelsResults from "@/components/search/results/models-results";

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
    return (
      <div className="w-full md:mx-48">
        {/* Mobile fixed header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <SearchBar query={q} initialMentions={mentions} className="w-full" />
            </div>
          </div>
        </div>
        {/* Spacer for fixed header height */}
        <div className="md:hidden h-[64px]" />

        {/* Mobile: show chats list only */}
        <div className="md:hidden px-3 py-3">
          <ChatsResults userId={userId} query={q} mentions={mentions} />
        </div>

        {/* Desktop layout */}
        <div className="hidden md:block w-full px-2.5 py-3">
          <SearchBar query={q} initialMentions={mentions} className="md:max-w-[600px] mx-auto" />
          {scopeModels ? (
            <ModelsResults userId={userId} query={q} mentions={mentions} />
          ) : (
            <ChatsResults userId={userId} query={q} mentions={mentions} />
          )}
        </div>
      </div>
    );
  }

  // When no query: default to chats unless a mention switches scope
  if (!q) {
    return (
      <div className="w-full md:mx-48">
        {/* Mobile fixed header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <SearchBar query={q} initialMentions={mentions} className="w-full" />
            </div>
          </div>
        </div>
        {/* Spacer for fixed header height */}
        <div className="md:hidden h-[64px]" />

        {/* Mobile: show chats list only */}
        <div className="md:hidden px-3 py-3">
          <ChatsResults userId={userId} />
        </div>

        {/* Desktop layout */}
        <div className="hidden md:block w-full px-2.5 py-3">
          <SearchBar query={q} initialMentions={mentions} className="md:max-w-[600px] mx-auto" />
          {scopeModels ? (
            <ModelsResults userId={userId} mentions={mentions} />
          ) : (
            <ChatsResults userId={userId} />
          )}
        </div>
      </div>
    );
  }
  return null;
}

