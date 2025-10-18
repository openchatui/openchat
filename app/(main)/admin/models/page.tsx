import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminModels } from "@/components/admin/models/AdminModels";
import db from "@/lib/db";
import { adminGetModels, adminGetGroupedModels } from "@/actions/chat";
import { ChatStore } from "@/lib/modules/chat";

export default async function AdminModelsPage() {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");

    // Load models server-side for better performance
    const [models, groupedModels] = await Promise.all([
        adminGetModels(),
        adminGetGroupedModels()
    ]);

    // Load models config
    let config = await db.config.findUnique({ where: { id: 1 } })
    const defaults = { models: { hidden: [], invisible: [], active: [], order: [] } }
    let modelsConfig = defaults.models
    if (!config) {
        config = await db.config.create({ data: { id: 1, data: defaults } })
    }
    const data = (config.data || {}) as any
    const maybeModels = data?.models
    if (maybeModels && typeof maybeModels === 'object') {
        modelsConfig = {
            hidden: Array.isArray(maybeModels.hidden) ? maybeModels.hidden : [],
            invisible: Array.isArray(maybeModels.invisible) ? maybeModels.invisible : [],
            active: Array.isArray(maybeModels.active) ? maybeModels.active : [],
            order: Array.isArray(maybeModels.order) ? maybeModels.order : [],
        }
        // Persist shaped config if any keys missing
        const needsPersist = !Array.isArray(maybeModels.hidden) || !Array.isArray(maybeModels.invisible) || !Array.isArray(maybeModels.active) || !Array.isArray(maybeModels.order)
        if (needsPersist) {
            await db.config.update({ where: { id: 1 }, data: { data: { ...data, models: modelsConfig } } })
        }
    } else {
        // Merge defaults into existing data instead of replacing entire JSON
        await db.config.update({ where: { id: 1 }, data: { data: { ...data, ...defaults } } })
    }

    const chats = await ChatStore.getUserChats(session.user.id)
    return (
        <AdminModels
            session={session}
            initialModels={models}
            initialGroupedModels={groupedModels}
            initialModelsConfig={modelsConfig}
            initialChats={chats}
        />
    );
}
