import fs from 'fs';
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

const oldStr = `  const URGENCY_STYLE: Record<string, { color: string; icon: string; label: string }> = {
    high: { color: "#F87171", icon: "rate_review", label: "Review PR" },
    medium: { color: "#FB923C", icon: "assignment_ind", label: "Assigned" },
    low: { color: "#5A6E63", icon: "alternate_email", label: "Mentioned" },
  };`;

const newStr = `  const ACTION_STYLE: Record<string, { color: string; icon: string; label: string }> = {
    review_request:    { color: "#F87171", icon: "rate_review",    label: "Review PR" },
    changes_requested: { color: "#F87171", icon: "edit_note",      label: "Needs Changes" },
    assigned_issue:    { color: "#FB923C", icon: "assignment_ind", label: "Assigned" },
    ready_to_merge:    { color: "#34D399", icon: "done_all",       label: "Ready to Merge" },
    mention:           { color: "#5A6E63", icon: "alternate_email",label: "Mentioned" },
  };`;

content = content.replace(oldStr, newStr);

content = content.replace(`const style = URGENCY_STYLE[item.urgency] ?? URGENCY_STYLE.low;`, `const style = ACTION_STYLE[item.type] ?? ACTION_STYLE.mention;`);

fs.writeFileSync('src/app/dashboard/page.tsx', content);
