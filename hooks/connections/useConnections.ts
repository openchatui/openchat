import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  DEFAULT_OPENAI_CONNECTION,
  DEFAULT_OLLAMA_CONNECTION,
  TOAST_MESSAGES,
} from "@/constants/connections";
import {
  getConnections,
  getConnectionsConfig,
  createConnections,
  updateConnection as updateConnectionApi,
  deleteConnection as deleteConnectionApi,
  updateConnectionsConfig,
  syncModels as syncModelsApi,
} from "@/lib/api/connections";
import type {
  Connection,
  CreateConnectionData,
  ConnectionsState,
  ConnectionFormState,
  EditState,
  ConnectionType,
  ConnectionsConfig,
} from "@/types/connections.types";

export function useConnections(
  initialConnections: Connection[] = [],
  initialConfig: ConnectionsConfig | null = null
) {
  const [connectionsState, setConnectionsState] = useState<ConnectionsState>({
    connections: initialConnections,
    isLoading: initialConnections.length === 0,
    isSaving: false,
    testingConnections: new Set(),
    successfulConnections: new Set(),
    deletingIds: new Set(),
  });

  const [formState, setFormState] = useState<ConnectionFormState>({
    newConnections: [DEFAULT_OPENAI_CONNECTION],
    newOllamaConnections: (() => {
      const hasOllama = initialConnections.some((c) => c.type === "ollama");
      return hasOllama ? [] : [DEFAULT_OLLAMA_CONNECTION];
    })(),
    visibleApiKeys: new Set(),
    visibleNewApiKeys: new Set(),
  });

  const [editState, setEditState] = useState<EditState>({
    editingConnection: null,
    editForm: { baseUrl: "", apiKey: "" },
    isUpdating: false,
    showEditApiKey: false,
  });

  const [connectionsConfig, setConnectionsConfig] =
    useState<ConnectionsConfig | null>(initialConfig);

  const loadConnections = useCallback(async () => {
    try {
      setConnectionsState((prev) => ({ ...prev, isLoading: true }));
      const [data, cfg] = await Promise.all([
        getConnections(),
        getConnectionsConfig()
          .then((r) => r.connections)
          .catch(() => null),
      ]);
      setConnectionsState((prev) => ({
        ...prev,
        connections: data as Connection[],
      }));
      if (cfg) setConnectionsConfig(cfg as ConnectionsConfig);

      // Update form state based on existing connections
      const hasOllamaConnection = (data as Connection[]).some(
        (conn) => conn.type === "ollama"
      );
      setFormState((prev) => ({
        ...prev,
        newOllamaConnections: hasOllamaConnection
          ? []
          : [DEFAULT_OLLAMA_CONNECTION],
      }));
    } catch (error) {
      console.error("Error loading connections:", error);
      toast.error("Failed to load connections");
    } finally {
      setConnectionsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const syncModels = useCallback(
    async (baseUrl: string, type: ConnectionType, apiKey?: string) => {
      try {
        return await syncModelsApi({ baseUrl: baseUrl.trim(), type, apiKey });
      } catch (error) {
        console.error("Error syncing models:", error);
        return null;
      }
    },
    []
  );

  const saveConnections = useCallback(
    async (connectionsToCreate: CreateConnectionData[]) => {
      try {
        setConnectionsState((prev) => ({ ...prev, isSaving: true }));

        await createConnections(connectionsToCreate);
        await loadConnections();

        // Reset forms
        setFormState((prev) => ({
          ...prev,
          newConnections: [DEFAULT_OPENAI_CONNECTION],
          newOllamaConnections: [DEFAULT_OLLAMA_CONNECTION],
        }));

        // Sync models for all connections
        for (const conn of connectionsToCreate) {
          await syncModels(conn.baseUrl, conn.type, conn.apiKey);
        }

        toast.success(
          `Successfully added ${connectionsToCreate.length} connection(s) and synced models`
        );
      } catch (error) {
        console.error("Error saving connections:", error);
        toast.error(
          error instanceof Error ? error.message : TOAST_MESSAGES.SAVE_FAILED
        );
      } finally {
        setConnectionsState((prev) => ({ ...prev, isSaving: false }));
      }
    },
    [loadConnections, syncModels]
  );

  const updateConnection = useCallback(async () => {
    if (!editState.editingConnection) return;

    try {
      setEditState((prev) => ({ ...prev, isUpdating: true }));

      await updateConnectionApi(editState.editingConnection.id, {
        type: editState.editingConnection.type,
        baseUrl: editState.editForm.baseUrl.trim(),
        apiKey:
          editState.editingConnection.type === "openai-api"
            ? editState.editForm.apiKey.trim()
            : undefined,
      });

      await loadConnections();

      // Sync models after updating
      const apiKey =
        editState.editingConnection.type === "openai-api"
          ? editState.editForm.apiKey.trim()
          : undefined;
      await syncModels(
        editState.editForm.baseUrl.trim(),
        editState.editingConnection.type,
        apiKey
      );

      setEditState((prev) => ({ ...prev, editingConnection: null }));
      toast.success(TOAST_MESSAGES.CONNECTION_UPDATED);
    } catch (error) {
      console.error("Error updating connection:", error);
      toast.error(
        error instanceof Error ? error.message : TOAST_MESSAGES.UPDATE_FAILED
      );
    } finally {
      setEditState((prev) => ({ ...prev, isUpdating: false }));
    }
  }, [
    editState.editingConnection,
    editState.editForm,
    loadConnections,
    syncModels,
  ]);

  const deleteConnection = useCallback(async () => {
    if (!editState.editingConnection) return;

    const wasOllama = editState.editingConnection.type === "ollama";

    try {
      setEditState((prev) => ({ ...prev, isUpdating: true }));
      await deleteConnectionApi(editState.editingConnection!.id);
      await loadConnections();

      // If we deleted an Ollama connection, show the new connection input
      if (wasOllama) {
        setFormState((prev) => ({
          ...prev,
          newOllamaConnections: [DEFAULT_OLLAMA_CONNECTION],
        }));
      }

      setEditState((prev) => ({ ...prev, editingConnection: null }));
      toast.success(TOAST_MESSAGES.CONNECTION_DELETED);
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast.error(
        error instanceof Error ? error.message : TOAST_MESSAGES.DELETE_FAILED
      );
    } finally {
      setEditState((prev) => ({ ...prev, isUpdating: false }));
    }
  }, [editState.editingConnection, loadConnections]);

  // Form management functions
  const addNewConnectionRow = useCallback(() => {
    const newId = (Date.now() + Math.random()).toString();
    setFormState((prev) => ({
      ...prev,
      newConnections: [
        ...prev.newConnections,
        { id: newId, baseUrl: "", apiKey: "" },
      ],
    }));
  }, []);

  const removeNewConnectionRow = useCallback(
    (id: string) => {
      if (formState.newConnections.length > 1) {
        setFormState((prev) => ({
          ...prev,
          newConnections: prev.newConnections.filter((conn) => conn.id !== id),
        }));
      }
    },
    [formState.newConnections.length]
  );

  const updateNewConnection = useCallback(
    (id: string, field: "baseUrl" | "apiKey", value: string) => {
      setFormState((prev) => ({
        ...prev,
        newConnections: prev.newConnections.map((conn) =>
          conn.id === id ? { ...conn, [field]: value } : conn
        ),
      }));
    },
    []
  );

  const updateNewOllamaConnection = useCallback(
    (id: string, field: "baseUrl", value: string) => {
      setFormState((prev) => ({
        ...prev,
        newOllamaConnections: prev.newOllamaConnections.map((conn) =>
          conn.id === id ? { ...conn, [field]: value } : conn
        ),
      }));
      // Clear success state when URL changes
      if (field === "baseUrl") {
        setConnectionsState((prev) => {
          const newSet = new Set(prev.successfulConnections);
          newSet.delete(id);
          return { ...prev, successfulConnections: newSet };
        });
      }
    },
    []
  );

  const handleClearAll = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      newConnections: [DEFAULT_OPENAI_CONNECTION],
    }));
  }, []);

  const toggleApiKeyVisibility = useCallback((id: string) => {
    setFormState((prev) => {
      const newSet = new Set(prev.visibleApiKeys);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { ...prev, visibleApiKeys: newSet };
    });
  }, []);

  const toggleNewApiKeyVisibility = useCallback((id: string) => {
    setFormState((prev) => {
      const newSet = new Set(prev.visibleNewApiKeys);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { ...prev, visibleNewApiKeys: newSet };
    });
  }, []);

  const handleEditConnection = useCallback((connection: Connection) => {
    setEditState({
      editingConnection: connection,
      editForm: {
        baseUrl: connection.baseUrl,
        apiKey: connection.apiKey || "",
      },
      isUpdating: false,
      showEditApiKey: false,
    });
  }, []);

  const toggleOpenAIConnectionEnabledAt = useCallback(
    async (index: number, enabled: boolean) => {
      try {
        const payload = {
          connections: {
            openai: { api_configs: { [String(index)]: { enable: enabled } } },
          },
        };
        await updateConnectionsConfig(payload);
        const cfg = await getConnectionsConfig()
          .then((r) => r.connections)
          .catch(() => null);
        if (cfg) setConnectionsConfig(cfg as ConnectionsConfig);
      } catch (error) {
        console.error("Failed to update OpenAI config enable:", error);
      }
    },
    []
  );

  const toggleOllamaEnabled = useCallback(async (enabled: boolean) => {
    try {
      const payload = { connections: { ollama: { enable: enabled } } };
      await updateConnectionsConfig(payload);
      const cfg = await getConnectionsConfig()
        .then((r) => r.connections)
        .catch(() => null);
      if (cfg) setConnectionsConfig(cfg as ConnectionsConfig);
    } catch (error) {
      console.error("Failed to update Ollama enable:", error);
    }
  }, []);

  // Connection testing functionality
  const testConnection = useCallback(
    async (
      connectionId: string,
      baseUrl: string,
      type: ConnectionType = "ollama",
      apiKey?: string
    ) => {
      if (!baseUrl.trim()) {
        toast.error(TOAST_MESSAGES.ENTER_BASE_URL);
        return;
      }

      try {
        setConnectionsState((prev) => ({
          ...prev,
          testingConnections: new Set(prev.testingConnections).add(
            connectionId
          ),
        }));

        // Clear any previous success state for this connection
        setConnectionsState((prev) => ({
          ...prev,
          successfulConnections: (() => {
            const newSet = new Set(prev.successfulConnections);
            newSet.delete(connectionId);
            return newSet;
          })(),
        }));

        // 100% client-side test to avoid server-to-localhost issues
        // Validate URL format first
        try {
          new URL(baseUrl.trim());
        } catch {
          throw new Error("Invalid URL");
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          // Use no-cors so we can at least detect reachability even if CORS is not enabled
          await fetch(baseUrl.trim(), {
            method: "GET",
            mode: "no-cors",
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        {
          // Mark as successful and don't show toast for 200 responses
          setConnectionsState((prev) => ({
            ...prev,
            successfulConnections: new Set(prev.successfulConnections).add(
              connectionId
            ),
          }));

          // Handle Ollama connections - ensure only one exists
          if (type === "ollama") {
            try {
              // Check if there's already an existing Ollama connection
              const existingOllamaConnection =
                connectionsState.connections.find(
                  (conn) => conn.type === "ollama"
                );

              if (existingOllamaConnection) {
                // If there's already an existing connection, just sync models
                await syncModels(baseUrl.trim(), "ollama");
                toast.success(TOAST_MESSAGES.CONNECTION_TEST_SUCCESSFUL_SYNC);
              } else {
                // If no existing connection, create one
                const connectionsToCreate: CreateConnectionData[] = [
                  {
                    type: "ollama",
                    baseUrl: baseUrl.trim(),
                  },
                ];

                await createConnections(connectionsToCreate);
                await loadConnections();
                toast.success(TOAST_MESSAGES.CONNECTION_SAVED);
                await syncModels(baseUrl.trim(), "ollama");

                // Clear the new connection input since we now have a saved connection
                setFormState((prev) => ({
                  ...prev,
                  newOllamaConnections: [],
                }));
              }
            } catch (error) {
              console.error("Error handling Ollama connection:", error);
              toast.error(TOAST_MESSAGES.CONNECTION_TEST_PASSED_SAVE_FAILED);
            }
          } else {
            toast.success(TOAST_MESSAGES.CONNECTION_TEST_SUCCESSFUL);
          }
        }
      } catch (error) {
        console.error("Error testing connection:", error);
        toast.error(TOAST_MESSAGES.CONNECTION_TEST_FAILED);
      } finally {
        setConnectionsState((prev) => ({
          ...prev,
          testingConnections: (() => {
            const newSet = new Set(prev.testingConnections);
            newSet.delete(connectionId);
            return newSet;
          })(),
        }));
      }
    },
    [loadConnections, syncModels, connectionsState.connections]
  );

  // Load on mount only if not provided by server
  useEffect(() => {
    if (initialConnections.length === 0) {
      loadConnections();
    }
  }, [loadConnections, initialConnections.length]);

  return {
    // State
    connections: connectionsState.connections,
    isLoading: connectionsState.isLoading,
    isSaving: connectionsState.isSaving,
    testingConnections: connectionsState.testingConnections,
    successfulConnections: connectionsState.successfulConnections,
    newConnections: formState.newConnections,
    newOllamaConnections: formState.newOllamaConnections,
    visibleApiKeys: formState.visibleApiKeys,
    visibleNewApiKeys: formState.visibleNewApiKeys,
    editingConnection: editState.editingConnection,
    editForm: editState.editForm,
    isUpdating: editState.isUpdating,
    showEditApiKey: editState.showEditApiKey,

    // Actions
    loadConnections,
    syncModels,
    saveConnections,
    updateConnection,
    deleteConnection,

    // Form management
    addNewConnectionRow,
    removeNewConnectionRow,
    updateNewConnection,
    updateNewOllamaConnection,
    handleClearAll,
    toggleApiKeyVisibility,
    toggleNewApiKeyVisibility,
    handleEditConnection,
    connectionsConfig,
    toggleOpenAIConnectionEnabledAt,
    toggleOllamaEnabled,

    // Connection testing
    testConnection,

    // Edit state setters
    setEditState,
    setConnectionsState: setConnectionsState,
    setFormState: setFormState,
  };
}
