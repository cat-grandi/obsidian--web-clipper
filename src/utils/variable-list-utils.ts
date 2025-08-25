import { initializeIcons } from '../icons/icons';
import { createElementWithClass, createElementWithHTML } from './dom-utils';
import type { Settings, Template } from '../types/types';

interface SetupVariableListOptions {
    listType: 'include' | 'exclude';
    inputId: string;
    listId: string;
    generalSettings?: Settings;
    saveSettings?: (settings?: Partial<Settings>) => void | Promise<void>;
    editingTemplate?: Template;
    onChange?: () => void;
}

export function setupVariableList(options: SetupVariableListOptions): void {
    const { listType, inputId, listId, generalSettings, saveSettings, editingTemplate, onChange } = options;
    const input = document.getElementById(inputId) as HTMLInputElement;
    const list = document.getElementById(listId) as HTMLUListElement;
    const listKey = listType === 'include' ? 'variableIncludeList' : 'variableExcludeList';

    const getArray = (): string[] => {
        if (generalSettings) {
            return generalSettings[listKey] || (generalSettings[listKey] = []);
        }
        if (editingTemplate) {
            return editingTemplate[listKey] || (editingTemplate[listKey] = []);
        }
        return [];
    };

    function updateList(): void {
        if (!list) return;
        list.innerHTML = '';
        const arr = getArray();
        arr.forEach((variable) => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.textContent = variable;
            li.appendChild(span);

            const removeBtn = createElementWithClass('button', 'remove-variable-btn clickable-icon');
            removeBtn.setAttribute('type', 'button');
            removeBtn.appendChild(createElementWithHTML('i', '', { 'data-lucide': 'trash-2' }));
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = arr.indexOf(variable);
                if (idx !== -1) {
                    arr.splice(idx, 1);
                    saveSettings?.();
                    onChange?.();
                    updateList();
                }
            });
            li.appendChild(removeBtn);
            list.appendChild(li);
        });
        initializeIcons(list);
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = input.value.trim();
                if (value) {
                    const arr = getArray();
                    arr.push(value);
                    input.value = '';
                    saveSettings?.();
                    onChange?.();
                    updateList();
                }
            }
        });
    }

    updateList();
}

export type { SetupVariableListOptions };

