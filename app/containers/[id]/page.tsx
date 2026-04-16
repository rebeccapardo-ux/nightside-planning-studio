import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ContainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: containerId } = await params;

  const supabase = await createSupabaseServerClient();

  // Auth check
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Container</h1>
        <p style={{ color: "crimson" }}>Auth error: {authError.message}</p>
        <Link href="/login">Go to login</Link>
      </main>
    );
  }

  if (!authData?.user) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Container</h1>
        <p>You are not logged in.</p>
        <Link href="/login">Go to login</Link>
      </main>
    );
  }

  // Container access
  const { data: container, error: containerError } = await supabase
    .from("containers")
    .select("id, title, created_at")
    .eq("id", containerId)
    .maybeSingle();

  if (containerError) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Container</h1>
        <p style={{ color: "crimson" }}>Error: {containerError.message}</p>
        <Link href="/containers">Back</Link>
      </main>
    );
  }

  if (!container) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Not found</h1>
        <p>This container doesn’t exist or you don’t have access.</p>
        <Link href="/containers">Back</Link>
      </main>
    );
  }

  async function createEntry(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) throw new Error("Not logged in");

    // 1) Create the entry itself
    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .insert({
        user_id: authData.user.id,
        title,
        content: null,
        // keep legacy field for now during transition
        container_id: containerId,
      })
      .select("id")
      .single();

    if (entryError) throw new Error(entryError.message);

    // 2) Link it to the container through the new join table
    const { error: linkError } = await supabase.from("container_entries").insert({
      user_id: authData.user.id,
      container_id: containerId,
      entry_id: entry.id,
    });

    if (linkError) throw new Error(linkError.message);

    revalidatePath(`/containers/${containerId}`);
  }

  async function renameEntry(formData: FormData) {
    "use server";

    const entryId = String(formData.get("entryId") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    if (!entryId || !title) return;

    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) throw new Error("Not logged in");

    const { error } = await supabase
      .from("entries")
      .update({ title })
      .eq("id", entryId);

    if (error) throw new Error(error.message);

    revalidatePath(`/containers/${containerId}`);
  }

  async function deleteEntry(formData: FormData) {
    "use server";

    const entryId = String(formData.get("entryId") ?? "");
    if (!entryId) return;

    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) throw new Error("Not logged in");

    // Transitional behavior: still delete the whole entry.
    // Later we may split this into "remove from container" vs "delete everywhere".
    const { error } = await supabase.from("entries").delete().eq("id", entryId);

    if (error) throw new Error(error.message);

    revalidatePath(`/containers/${containerId}`);
  }

  // Read entries through the join table
  const { data: containerEntries, error: entriesError } = await supabase
    .from("container_entries")
    .select(
      `
        id,
        created_at,
        entry:entries (
          id,
          title,
          created_at
        )
      `
    )
    .eq("container_id", containerId)
    .order("created_at", { ascending: false });

  if (entriesError) {
    return (
      <main style={{ padding: 24 }}>
        <Link href="/containers">← Back</Link>
        <h1 style={{ marginTop: 16 }}>{container.title}</h1>
        <p style={{ color: "crimson" }}>Error: {entriesError.message}</p>
      </main>
    );
  }

  const entries =
    containerEntries
      ?.map((ce) => ce.entry)
      .filter(Boolean) ?? [];

  return (
    <main style={{ padding: 24 }}>
      <Link href="/containers">← Back</Link>

      <h1 style={{ marginTop: 16 }}>{container.title}</h1>
      <p style={{ opacity: 0.7 }}>
        Logged in as: {authData.user.email ?? authData.user.id}
      </p>

      <hr style={{ margin: "24px 0" }} />

      <h2 style={{ marginBottom: 8 }}>Entries</h2>

      <form action={createEntry} style={{ marginTop: 12, marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          New entry title
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            name="title"
            placeholder='e.g., "Health care proxy"'
            style={{ padding: 8, width: 360 }}
          />
          <button type="submit" style={{ padding: "8px 12px" }}>
            Add
          </button>
        </div>
      </form>

      {entries.length === 0 && <p>No entries yet.</p>}

      {entries.length > 0 && (
        <ul style={{ paddingLeft: 18 }}>
          {entries.map((e) => (
            <li key={e.id} style={{ marginBottom: 18 }}>
              <form action={renameEntry} style={{ display: "flex", gap: 8 }}>
                <input type="hidden" name="entryId" value={e.id} />
                <input
                  name="title"
                  defaultValue={e.title}
                  style={{ padding: 8, width: 360 }}
                />
                <button type="submit" style={{ padding: "8px 12px" }}>
                  Save
                </button>

                <Link
                  href={`/containers/${containerId}/entries/${e.id}`}
                  style={{ alignSelf: "center", marginLeft: 8 }}
                >
                  Open
                </Link>
              </form>

              <form action={deleteEntry} style={{ marginTop: 8 }}>
                <input type="hidden" name="entryId" value={e.id} />
                <button type="submit" style={{ padding: "6px 10px" }}>
                  Delete
                </button>
              </form>

              <small style={{ opacity: 0.6 }}>
                {new Date(e.created_at).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}