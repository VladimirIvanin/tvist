<template>
  <div class="options-table">
    <div class="options-search">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Поиск по названию или описанию..."
        class="search-input"
      >
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Опция</th>
            <th>Тип</th>
            <th>По умолчанию</th>
            <th>Описание</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="option in filteredOptions" :key="option.name">
            <tr :class="{ 'has-nested': option.nested }">
              <td>
                <code class="option-name">{{ option.name }}</code>
                <button 
                  v-if="option.nested" 
                  @click="toggleNested(option.name)"
                  class="toggle-btn"
                  :class="{ 'is-open': expandedOptions.has(option.name) }"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </td>
              <td><code class="type">{{ option.type }}</code></td>
              <td><code class="default">{{ option.default }}</code></td>
              <td class="description">{{ option.description }}</td>
            </tr>
            
            <!-- Вложенные опции -->
            <template v-if="option.nested && expandedOptions.has(option.name)">
              <tr 
                v-for="nested in option.nested" 
                :key="`${option.name}.${nested.name}`"
                class="nested-row"
              >
                <td class="nested-name">
                  <code class="option-name">{{ option.name }}.{{ nested.name }}</code>
                </td>
                <td><code class="type">{{ nested.type }}</code></td>
                <td><code class="default">{{ nested.default || '—' }}</code></td>
                <td class="description">{{ nested.description }}</td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="filteredOptions.length === 0" class="no-results">
      Ничего не найдено по запросу "{{ searchQuery }}"
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import optionsMeta from '../options-meta.json'

interface NestedOption {
  name: string
  type: string
  default?: string
  description: string
}

interface Option {
  name: string
  type: string
  default: string
  description: string
  nested?: NestedOption[]
}

const searchQuery = ref('')
const expandedOptions = ref<Set<string>>(new Set())

const options = optionsMeta.options as Option[]

const filteredOptions = computed(() => {
  if (!searchQuery.value) {
    return options
  }

  const query = searchQuery.value.toLowerCase()
  return options.filter(option => {
    const matchesMain = 
      option.name.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.type.toLowerCase().includes(query)

    const matchesNested = option.nested?.some(nested =>
      nested.name.toLowerCase().includes(query) ||
      nested.description.toLowerCase().includes(query)
    )

    // Автоматически раскрываем, если есть совпадение во вложенных
    if (matchesNested && option.nested) {
      expandedOptions.value.add(option.name)
    }

    return matchesMain || matchesNested
  })
})

const toggleNested = (optionName: string) => {
  if (expandedOptions.value.has(optionName)) {
    expandedOptions.value.delete(optionName)
  } else {
    expandedOptions.value.add(optionName)
  }
}
</script>

<style scoped>
.options-table {
  margin: 2rem 0;
}

.options-search {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--vp-c-bg);
}

thead {
  background: var(--vp-c-bg-soft);
}

th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
  white-space: nowrap;
}

tbody tr {
  border-bottom: 1px solid var(--vp-c-divider);
  transition: background-color 0.2s;
}

tbody tr:hover {
  background: var(--vp-c-bg-soft);
}

tbody tr.nested-row {
  background: var(--vp-c-bg-soft);
}

tbody tr.nested-row:hover {
  background: var(--vp-c-bg-mute);
}

td {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  vertical-align: top;
}

td.nested-name {
  padding-left: 2.5rem;
  position: relative;
}

td.nested-name::before {
  content: '└';
  position: absolute;
  left: 1.5rem;
  color: var(--vp-c-text-3);
}

.option-name {
  font-weight: 600;
  color: var(--vp-c-brand-1);
  font-size: 0.875rem;
}

code {
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.875em;
}

.type {
  background: var(--vp-code-bg);
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.default {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.description {
  line-height: 1.6;
  max-width: 400px;
}

.has-nested td:first-child {
  position: relative;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 0.5rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.2s;
  vertical-align: middle;
}

.toggle-btn:hover {
  color: var(--vp-c-brand-1);
  transform: scale(1.1);
}

.toggle-btn svg {
  transition: transform 0.2s;
}

.toggle-btn.is-open svg {
  transform: rotate(180deg);
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  margin-top: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  th, td {
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  .description {
    max-width: none;
  }
  
  th:nth-child(2),
  td:nth-child(2),
  th:nth-child(3),
  td:nth-child(3) {
    display: none;
  }
}
</style>
