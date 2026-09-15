import { Field, Input, Select } from "@/components/ui/form";

export type ChecklistItem = {
  id: string;
  label: string;
  type: "PASS_FAIL" | "YES_NO" | "NUMERIC" | "TEXT" | "PHOTO_REQUIRED";
  required: boolean;
};

export function ChecklistFieldInput({ item }: { item: ChecklistItem }) {
  const name = `checklist_${item.id}`;
  if (item.type === "PASS_FAIL") {
    return (
      <Field label={item.label} htmlFor={name} required={item.required}>
        <Select id={name} name={name} required={item.required} defaultValue="">
          <option value="" disabled>
            Select
          </option>
          <option value="PASS">Pass</option>
          <option value="FAIL">Fail</option>
        </Select>
      </Field>
    );
  }
  if (item.type === "YES_NO") {
    return (
      <Field label={item.label} htmlFor={name} required={item.required}>
        <Select id={name} name={name} required={item.required} defaultValue="">
          <option value="" disabled>
            Select
          </option>
          <option value="YES">Yes</option>
          <option value="NO">No</option>
        </Select>
      </Field>
    );
  }
  if (item.type === "NUMERIC") {
    return (
      <Field label={item.label} htmlFor={name} required={item.required}>
        <Input id={name} name={name} type="number" step="any" required={item.required} />
      </Field>
    );
  }
  if (item.type === "PHOTO_REQUIRED") {
    return (
      <Field label={`${item.label} (photo URL — upload service pending)`} htmlFor={name} required={item.required}>
        <Input id={name} name={name} type="url" placeholder="https://" required={item.required} />
      </Field>
    );
  }
  return (
    <Field label={item.label} htmlFor={name} required={item.required}>
      <Input id={name} name={name} required={item.required} />
    </Field>
  );
}
