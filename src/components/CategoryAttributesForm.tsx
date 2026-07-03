import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CATEGORY_ATTRIBUTES } from "@/lib/search-metadata.functions";

interface CategoryAttributesFormProps {
  category?: string;
  attributes: Record<string, any>;
  onChange: (attributes: Record<string, any>) => void;
}

/**
 * Smart form component that displays category-specific attributes
 * Only rendered if the category has predefined attributes
 * Helps sellers provide structured data that improves search ranking
 */
export function CategoryAttributesForm({
  category,
  attributes,
  onChange,
}: CategoryAttributesFormProps) {
  if (!category || !CATEGORY_ATTRIBUTES[category]) {
    return null;
  }

  const attrDefinitions = CATEGORY_ATTRIBUTES[category];

  const handleChange = (attrName: string, value: any) => {
    onChange({
      ...attributes,
      [attrName]: value,
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-medium text-primary mb-3">
          Optional details for "{category}"
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          These details help buyers find your product faster.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {attrDefinitions.map((attr) => (
          <div key={attr.name}>
            <Label htmlFor={`attr-${attr.name}`} className="text-xs mb-1.5 block">
              {attr.name}
            </Label>

            {attr.values ? (
              // Dropdown for predefined values
              <select
                id={`attr-${attr.name}`}
                value={attributes[attr.name] || ""}
                onChange={(e) => handleChange(attr.name, e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select {attr.name}</option>
                {attr.values.map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            ) : (
              // Text input for open-ended values
              <Input
                id={`attr-${attr.name}`}
                type="text"
                value={attributes[attr.name] || ""}
                onChange={(e) => handleChange(attr.name, e.target.value)}
                placeholder={`e.g., ${attr.name.toLowerCase()}`}
                className="text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
