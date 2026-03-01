/**
 * HouseRulesManager Component
 *
 * Parent container for house style rules management.
 * Delegates state to useHouseRulesState hook and rendering to sub-components.
 */

import { Plus, Download } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { RuleSetManager } from './RuleSetManager';
import { useHouseRulesState } from './useHouseRulesState';
import { HouseRulesTabs } from './HouseRulesTabs';
import { RulesListTab } from './RulesListTab';
import { RulesListContent } from './RulesListContent';
import { RuleFormModal } from './RuleFormModal';
import { StyleGuideUploadTab } from './StyleGuideUploadTab';
import { BestPracticesTab } from './BestPracticesTab';

interface HouseRulesManagerProps {
  className?: string;
}

export function HouseRulesManager({ className }: HouseRulesManagerProps) {
  const state = useHouseRulesState();

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">House Style Rules</h2>
          <div className="flex items-center gap-2">
            {state.activeTab === 'rules' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={state.handleExport}
                  isLoading={state.isExporting}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={state.handleOpenCreate}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  New Rule
                </Button>
              </>
            )}
          </div>
        </div>

        <HouseRulesTabs
          activeTab={state.activeTab}
          onTabChange={state.setActiveTab}
          ruleSetsCount={state.ruleSets.length}
          rulesCount={state.rules.length}
        />

        {state.activeTab === 'rules' && (
          <RulesListTab
            searchQuery={state.searchQuery}
            onSearchChange={state.setSearchQuery}
            categoryFilter={state.categoryFilter}
            onCategoryFilterChange={state.setCategoryFilter}
            importFile={state.importFile}
            onImportFileChange={state.setImportFile}
            onImport={state.handleImport}
            isImporting={state.isImporting}
            showForm={state.showForm}
          />
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {state.activeTab === 'upload' && (
          <StyleGuideUploadTab
            styleGuideFile={state.styleGuideFile}
            onFileChange={state.setStyleGuideFile}
            onUpload={state.handleStyleGuideUpload}
            isUploading={state.isUploading}
            extractedRules={state.extractedRules}
            selectedExtractedRules={state.selectedExtractedRules}
            extractionResult={state.extractionResult}
            onToggleRule={state.toggleExtractedRule}
            onToggleAll={state.toggleAllExtractedRules}
            onClearExtraction={state.handleClearExtraction}
            onOpenSaveDialog={state.handleOpenSaveDialog}
            showSaveDialog={state.showSaveDialog}
            onCloseSaveDialog={() => state.setShowSaveDialog(false)}
            saveRuleSetName={state.saveRuleSetName}
            onSaveRuleSetNameChange={state.setSaveRuleSetName}
            saveRuleSetDescription={state.saveRuleSetDescription}
            onSaveRuleSetDescriptionChange={state.setSaveRuleSetDescription}
            saveRuleSetStyleGuide={state.saveRuleSetStyleGuide}
            onSaveRuleSetStyleGuideChange={state.setSaveRuleSetStyleGuide}
            onSaveExtractedRules={state.handleSaveExtractedRules}
            isSaving={state.isSavingExtracted}
            onTabChange={state.setActiveTab}
          />
        )}

        {state.activeTab === 'rule-sets' && (
          <div className="p-6">
            <RuleSetManager onEditRule={state.handleOpenEdit} />
          </div>
        )}

        {state.activeTab === 'best-practices' && (
          <BestPracticesTab
            bestPractices={state.bestPractices}
            isLoading={state.isLoadingBestPractices}
            categories={state.bestPracticesData?.categories}
            selectedPractices={state.selectedBestPractices}
            onTogglePractice={state.toggleBestPractice}
            onToggleAll={state.toggleAllBestPractices}
            onImport={state.handleImportBestPractices}
            isImporting={state.isImportingBestPractices}
          />
        )}

        {state.activeTab === 'rules' && state.showForm ? (
          <RuleFormModal
            isEditing={!!state.editingRule}
            formData={state.formData}
            onFormChange={state.handleFormChange}
            onSubmit={state.handleSubmit}
            onClose={state.handleCloseForm}
            isSaving={state.isSaving}
            testText={state.testText}
            onTestTextChange={state.setTestText}
            showTestPanel={state.showTestPanel}
            onToggleTestPanel={() => state.setShowTestPanel(!state.showTestPanel)}
            onTestRule={state.handleTestRule}
            isTestingRule={state.isTestingRule}
            testResult={state.testResult}
          />
        ) : state.activeTab === 'rules' ? (
          <div className="p-6">
            <RulesListContent
              rules={state.rules}
              isLoading={state.isLoading}
              searchQuery={state.searchQuery}
              categoryFilter={state.categoryFilter}
              onOpenCreate={state.handleOpenCreate}
              onOpenEdit={state.handleOpenEdit}
              onDelete={state.handleDelete}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default HouseRulesManager;
