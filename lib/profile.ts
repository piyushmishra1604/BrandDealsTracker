export type BankAccount = {
  id: string;
  label: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifscOrSwift?: string;
  upiId?: string;
};

export function isBankAccounts(value: unknown): value is BankAccount[] {
  return Array.isArray(value) && value.length <= 20 && value.every(entry => {
    if (!entry || typeof entry !== "object") return false;
    const account = entry as BankAccount;
    return typeof account.id === "string" && !!account.id
      && typeof account.label === "string" && !!account.label.trim() && account.label.length <= 60
      && (["bankName", "accountHolder", "accountNumber", "ifscOrSwift", "upiId"] as const).every(key =>
        account[key] === undefined || (typeof account[key] === "string" && account[key].length <= 120));
  });
}

export type Profile = {
  id: string;
  brandName?: string;
  senderName: string;
  senderEmail?: string;
  senderAddress?: string;
  bankAccounts: BankAccount[];
  // Set by the database trigger on every save.
  updated_at?: string;
};

export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Profile;
  return typeof profile.id === "string" && !!profile.id
    && (profile.brandName === undefined || (typeof profile.brandName === "string" && profile.brandName.length <= 120))
    && typeof profile.senderName === "string" && profile.senderName.length <= 120
    && (profile.senderEmail === undefined || (typeof profile.senderEmail === "string" && profile.senderEmail.length <= 254))
    && (profile.senderAddress === undefined || (typeof profile.senderAddress === "string" && profile.senderAddress.length <= 300))
    && isBankAccounts(profile.bankAccounts);
}
