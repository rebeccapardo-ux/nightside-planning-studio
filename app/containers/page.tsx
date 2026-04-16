import { createSupabaseServerClient } from "@/lib/supabase-server";

type Entry = {
  id: string;
  title: string | null;
  section: string | null;
  activity: string | null;
  created_at: string;
};

type GroupedEntries = {
  [section: string]: {
    [activity: string]: Entry[];
  };
};

function formatLabel(value: string | null, fallback: string) {
  if (!value) return fallback;

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ContainersPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <main style={{ padding: "24px" }}>
        <h1>My Materials</h1>
        <p style={{ color: "crimson" }}>
          You need to be logged in to view this page.
        </p>
      </main>
    );
  }

  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, title, section, activity, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: "24px" }}>
        <h1>My Materials</h1>
        <p style={{ color: "crimson" }}>
          Error loading materials: {error.message}
        </p>
      </main>
    );
  }

  const groupedEntries: GroupedEntries = (entries || []).reduce(
    (acc: GroupedEntries, entry: Entry) => {
      const section = entry.section || "uncategorized";
      const activity = entry.activity || "other";

      if (!acc[section]) {
        acc[section] = {};
      }

      if (!acc[section][activity]) {
        acc[section][activity] = [];
      }

      acc[section][activity].push(entry);

      return acc;
    },
    {}
  );

  const sectionKeys = Object.keys(groupedEntries);

  return (
    <main style={{ padding: "24px", maxWidth: "900px" }}>
      <h1 style={{ marginBottom: "8px" }}>My Materials</h1>
      <p style={{ marginBottom: "32px", color: "#555" }}>
        Notes and reflections you’ve chosen to save.
      </p>

      {sectionKeys.length === 0 ? (
        <p>No saved materials yet.</p>
      ) : (
        sectionKeys.map((sectionKey) => {
          const activities = groupedEntries[sectionKey];
          const activityKeys = Object.keys(activities);

          return (
            <section key={sectionKey} style={{ marginBottom: "40px" }}>
              <h2 style={{ marginBottom: "16px" }}>
                {formatLabel(sectionKey, "Uncategorized")}
              </h2>

              {activityKeys.map((activityKey) => (
                <div key={activityKey} style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      marginBottom: "12px",
                      fontSize: "1rem",
                      color: "#444",
                    }}
                  >
                    {formatLabel(activityKey, "Other")}
                  </h3>

                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {activities[activityKey].map((entry) => {
                      const content = entry.title?.trim() || "";
                      const parts = content.split(" — ");
                      const promptPart = parts[0];
                      const responsePart = parts[1];

                      return (
                        <li
                          key={entry.id}
                          style={{
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            padding: "12px 14px",
                            marginBottom: "10px",
                            background: "#f9f9f9",
                          }}
                        >
                          {responsePart ? (
                            <>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "13px",
                                  color: "#666",
                                }}
                              >
                                {promptPart}
                              </p>
                              <p
                                style={{
                                  margin: "6px 0 0",
                                  color: "#222",
                                }}
                              >
                                {responsePart}
                              </p>
                            </>
                          ) : (
                            <p style={{ margin: 0, color: "#222" }}>
                              {content || "(Untitled note)"}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          );
        })
      )}
    </main>
  );
}