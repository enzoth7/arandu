import { FACILITY_ATTRIBUTE_FILTER_GROUPS } from "../../lib/facility-filter-options.mjs";
import type {
  FacilityAttributeFilterKey,
  FacilityAttributeFilters,
} from "../../lib/facility-filter-options.mjs";

type RegistryAttributeFiltersProps = {
  value: FacilityAttributeFilters;
  onToggle: (group: FacilityAttributeFilterKey, option: string) => void;
};

export function RegistryAttributeFilters({ value, onToggle }: RegistryAttributeFiltersProps) {
  return <div className="registryAdvancedFilters">
    <div className="registryAttributeGroups">
      {FACILITY_ATTRIBUTE_FILTER_GROUPS.map((group) => (
        <fieldset key={group.key}>
          <legend>{group.label}</legend>
          <ul>
            {group.options.map(([option, label]) => (
              <li key={option}>
                <label>
                  <input
                    type="checkbox"
                    checked={value[group.key].includes(option)}
                    onChange={() => onToggle(group.key, option)}
                  />
                  <span>{label}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
    </div>
  </div>;
}
