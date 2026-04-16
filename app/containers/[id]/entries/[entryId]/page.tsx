import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function EntryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; entryId: string }>;
  searchParams: Promise<{ confirmDelete?: string }>;
}) {
  const { id: containerId, entryId } = await params;
  const { confirmDelete } = await searchParams;

  const supabase = await createSupabaseServerClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    return (
      <main style={{ padding: 24 }}>
        <p>You are not logged in.</p>
        <Link href="/login">Go to login</Link>
      </main>
    );
  }

  // Verify container access
  const { data: container } = await supabase
    .from("containers")
    .select("id, title")
    .eq("id", containerId)
    .maybeSingle();

  if (!container) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Not found</h1>
        <p>This container doesn’t exist or you don’t have access.</p>
        <Link href="/containers">Back</Link>
      </main>
    );
  }

  // Fetch entry
  const { data: entry, error } = await supabase
    .from("entries")
    .select("id, title, content, created_at")
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <p style={{ color: "crimson" }}>Error: {error.message}</p>
        <Link href={`/containers/${containerId}`}>Back</Link>
      </main>
    );
  }

  if (!entry) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Entry not found</h1>
        <Link href={`/containers/${containerId}`}>Back</Link>
      </main>
    );
  }

  // Fetch containers this entry belongs to
  const { data: entryContainers } = await supabase
    .from("container_entries")
    .select(
      `
      container_id,
      container:containers (
        id,
        title
      )
    `
    )
    .eq("entry_id", entryId);

  const normalizedEntryContainers =
    entryContainers?.map((ce) => {
      const containerData = Array.isArray(ce.container)
        ? ce.container[0]
        : ce.container;

      return {
        container_id: ce.container_id,
        title: containerData?.title ?? "Untitled container",
      };
    }) ?? [];

  const existingContainerIds = new Set(
    normalizedEntryContainers.map((c) => c.container_id)
  );

  // Fetch all containers
  const { data: allContainers } = await supabase
    .from("containers")
    .select("id, title")
    .order("created_at", { ascending: true });

  const availableContainers =
    allContainers?.filter((c) => !existingContainerIds.has(c.id)) ?? [];

  const canRemoveFromThisContainer =
    normalizedEntryContainers.length > 1 &&
    existingContainerIds.has(containerId);

  async function updateContent(formData: FormData) {
    "use server";

    const content = String(formData.get("content") ?? "");

    const supabase = await createSupabaseServerClient();
    await supabase.from("entries").update({ content }).eq("id", entryId);

    revalidatePath(`/containers/${containerId}/entries/${entryId}`);
  }

  async function addToContainer(formData: FormData) {
    "use server";

    const targetContainerId = String(formData.get("targetContainerId") ?? "");

    if (!targetContainerId) return;

    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) return;

    const { data: existingLink } = await supabase
      .from("container_entries")
      .select("id")
      .eq("entry_id", entryId)
      .eq("container_id", targetContainerId)
      .maybeSingle();

    if (!existingLink) {
      await supabase.from("container_entries").insert({
        user_id: authData.user.id,
        entry_id: entryId,
        container_id: targetContainerId,
      });
    }

    revalidatePath(`/containers/${containerId}/entries/${entryId}`);
  }

  async function removeFromThisContainer() {
    "use server";

    const supabase = await createSupabaseServerClient();

    await supabase
      .from("container_entries")
      .delete()
      .eq("entry_id", entryId)
      .eq("container_id", containerId);

    revalidatePath(`/containers/${containerId}`);
    redirect(`/containers/${containerId}`);
  }

  async function deleteEntryEverywhere() {
    "use server";

    const supabase = await createSupabaseServerClient();

    await supabase.from("entries").delete().eq("id", entryId);

    revalidatePath(`/containers/${containerId}`);
    redirect(`/containers/${containerId}`);
  }

  return (
    <main style={{ padding: 24 }}>
      <Link href={`/containers/${containerId}`}>← Back</Link>

      <h1 style={{ marginTop: 16 }}>{entry.title}</h1>

      <p style={{ opacity: 0.6 }}>
        Created: {new Date(entry.created_at).toLocaleString()}
      </p>

      <div style={{ marginTop: 16 }}>
        <strong>Appears in:</strong>
        <ul>
          {normalizedEntryContainers.map((c) => (
            <li key={c.container_id}>
              <Link href={`/containers/${c.container_id}`}>
                {c.title}
              </Link>
              {c.container_id === containerId && " (current)"}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Add to another container:</strong>

        {availableContainers.length === 0 ? (
          <p style={{ marginTop: 8, opacity: 0.7 }}>
            This entry is already in all available containers.
          </p>
        ) : (
          <form action={addToContainer} style={{ marginTop: 8 }}>
            <select name="targetContainerId" defaultValue="">
              <option value="" disabled>
                Select a container
              </option>
              {availableContainers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <button style={{ marginLeft: 8 }}>Add</button>
          </form>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        {canRemoveFromThisContainer && (
          <form action={removeFromThisContainer}>
            <button>Remove from this container</button>
          </form>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        {!confirmDelete ? (
          <Link
            href={`/containers/${containerId}/entries/${entryId}?confirmDelete=1`}
            style={{ color: "crimson" }}
          >
            Delete entry
          </Link>
        ) : (
          <div style={{ color: "crimson" }}>
            <p>This will delete this entry from all containers.</p>
            <form action={deleteEntryEverywhere}>
              <button>Yes, delete everywhere</button>
            </form>
            <Link href={`/containers/${containerId}/entries/${entryId}`}>
              Cancel
            </Link>
          </div>
        )}
      </div>

      <hr style={{ margin: "24px 0" }} />

      <form action={updateContent}>
        <textarea
          name="content"
          defaultValue={entry.content ?? ""}
          rows={12}
          style={{ width: "100%" }}
        />
        <button style={{ marginTop: 12 }}>Save</button>
      </form>
    </main>
  );
}