/**
 * Error message translator
 * Maps technical errors to human-friendly messages
 * Always show kind, helpful feedback to users
 */

export function humanizeError(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";

  const msg = typeof error === "string" ? error : 
              error instanceof Error ? error.message : 
              JSON.stringify(error);

  const lower = msg.toLowerCase();

  // Authentication errors
  if (lower.includes("invalid login credentials")) 
    return "Email or password is incorrect. Please try again.";
  if (lower.includes("not confirmed"))
    return "Please verify your email address before signing in.";
  if (lower.includes("user already exists"))
    return "An account with this email already exists. Please sign in instead.";
  if (lower.includes("invalid email"))
    return "Please enter a valid email address.";
  if (lower.includes("password"))
    return "Password must be at least 6 characters.";

  // Phone number errors
  if (lower.includes("phone") || lower.includes("whatsapp"))
    return "Please enter a valid Nigerian phone number (e.g., 08012345678).";

  // Database/Connection errors
  if (lower.includes("database") || lower.includes("connection"))
    return "We couldn't save your changes. Please check your connection and try again.";
  if (lower.includes("timeout") || lower.includes("timed out"))
    return "Request took too long. Please check your connection and try again.";

  // Permission errors
  if (lower.includes("permission denied") || lower.includes("forbidden"))
    return "You don't have permission to perform this action.";

  // Validation errors
  if (lower.includes("required"))
    return "Please complete all required fields.";
  if (lower.includes("validation failed"))
    return "Please check your information and try again.";

  // File/Upload errors
  if (lower.includes("file too large") || lower.includes("file size"))
    return "File is too large. Please choose a smaller image.";
  if (lower.includes("file type") || lower.includes("unsupported format"))
    return "File format not supported. Please use JPG or PNG.";

  // Default: show generic message, log technical detail
  if (msg.length < 100) {
    return msg; // If short, might already be user-friendly
  }
  
  console.debug("[error-humanize] Technical error:", msg);
  return "Something went wrong. Please try again or contact support.";
}

/**
 * For form validation errors (not API errors)
 */
export function validateNigerianPhoneFormat(phone: string): string | null {
  if (!phone || phone.trim() === "") return "Phone number is required.";
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");
  
  // Must be 10 digits (without country code) or 12 digits (with country code)
  if (cleaned.length === 10) return null; // Valid: 08012345678
  if (cleaned.length === 12) return null; // Valid: 2348012345678
  if (cleaned.length === 13 && cleaned.startsWith("234")) return null; // Valid: +2348012345678
  
  return "Please enter a valid Nigerian phone number (e.g., 08012345678, 2348012345678, or +2348012345678).";
}

/**
 * Normalize Nigerian phone number to standard format (08012345678)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-digits and spaces
  const cleaned = phone.trim().replace(/\D/g, "");
  
  // If 10 digits (starting with 8), prepend 0: 8012345678 → 08012345678
  if (cleaned.length === 10 && cleaned.startsWith("8")) {
    return "0" + cleaned;
  }
  
  // If 12 digits (starting with 234), convert to 0 format: 2348012345678 → 08012345678
  if (cleaned.length === 12 && cleaned.startsWith("234")) {
    return "0" + cleaned.slice(2);
  }
  
  // If 13 digits (starting with +234 which was cleaned to 234), same as above
  if (cleaned.length === 12 && cleaned.startsWith("234")) {
    return "0" + cleaned.slice(2);
  }
  
  // Already in correct format or invalid, return as-is
  return cleaned.startsWith("0") ? cleaned : "0" + cleaned;
}
