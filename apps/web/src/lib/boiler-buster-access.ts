export function canAccessBoilerBuster(role: string | null | undefined) {
  return role !== "staff" && role !== "manager";
}
