<script lang="ts">
  import { settings } from "$lib/stores/settings.svelte";
  import {
    ChevronDown,
    RotateCcw,
    FolderOpen,
    BookOpen,
    Brain,
    Search,
    Bug,
    Code2,
    Settings2,
  } from "lucide-svelte";
  import * as Card from "$lib/components/ui/card";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import { Slider } from "$lib/components/ui/slider";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import { Separator } from "$lib/components/ui/separator";
  import { Badge } from "$lib/components/ui/badge";

  // Section visibility state
  let showLorebookImportSection = $state(false);
  let showLoreManagementSection = $state(false);
  let showClassifierSection = $state(false);
  let showEntryRetrievalSection = $state(false);

  // Manual mode toggle handler
  async function handleManualModeToggle(checked: boolean) {
    await settings.setAdvancedManualMode(checked);
  }

  // Debug mode toggle handler
  function handleDebugModeToggle(checked: boolean) {
    settings.setDebugMode(checked);
  }
</script>

<div class="space-y-6 pb-20">
  <div class="grid gap-6">
    <!-- General Advanced Settings Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Settings2 class="h-5 w-5" />
          General
        </Card.Title>
        <Card.Description>
          System-wide advanced configurations.
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-6">
        <!-- Manual Request Mode -->
        <div class="flex flex-row items-center justify-between rounded-lg border p-4">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <Code2 class="h-4 w-4 text-muted-foreground" />
              <Label class="text-base">Manual Request Mode</Label>
            </div>
            <p class="text-xs text-muted-foreground">
              Edit full request body parameters for advanced models.
            </p>
            {#if settings.advancedRequestSettings.manualMode}
              <p class="text-xs text-amber-500 font-medium pt-1">
                Manual mode active. Temperature and max token controls are locked.
              </p>
            {/if}
          </div>
          <Switch
            checked={settings.advancedRequestSettings.manualMode}
            onCheckedChange={handleManualModeToggle}
          />
        </div>

        <!-- Debug Mode -->
        <div class="flex flex-row items-center justify-between rounded-lg border p-4">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <Bug class="h-4 w-4 text-muted-foreground" />
              <Label class="text-base">Debug Mode</Label>
            </div>
            <p class="text-xs text-muted-foreground">
              Log API requests and responses for debugging.
            </p>
            {#if settings.uiSettings.debugMode}
              <p class="text-xs text-amber-500 font-medium pt-1">
                Logs are session-only and not persisted.
              </p>
            {/if}
          </div>
          <Switch
            checked={settings.uiSettings.debugMode}
            onCheckedChange={handleDebugModeToggle}
          />
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Service Specific Settings -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Service Configurations</h3>
      
      <!-- Lorebook Import Settings -->
      <Card.Root>
        <Collapsible.Root bind:open={showLorebookImportSection}>
          <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10">
                <FolderOpen class="h-4 w-4 text-green-500" />
              </div>
              <div>
                <h3 class="font-medium leading-none">Lorebook Import</h3>
                <p class="text-xs text-muted-foreground mt-1">Batch size and concurrency</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
               <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onclick={() => settings.resetLorebookClassifierSpecificSettings()}
                title="Reset to default"
              >
                <RotateCcw class="h-3.5 w-3.5" />
              </Button>
              <Collapsible.Trigger asChild let:builder>
                <Button builders={[builder]} variant="ghost" size="sm" class="h-8 w-8 p-0">
                  {#if showLorebookImportSection}
                    <ChevronDown class="h-4 w-4 rotate-180 transition-transform duration-200" />
                  {:else}
                    <ChevronDown class="h-4 w-4 transition-transform duration-200" />
                  {/if}
                  <span class="sr-only">Toggle</span>
                </Button>
              </Collapsible.Trigger>
            </div>
          </div>
          
          <Collapsible.Content>
            <div class="px-4 pb-4 pt-0 space-y-6">
              <Separator class="mb-4" />
              
              <!-- Batch Size -->
              <div class="space-y-3">
                <div class="flex justify-between">
                  <Label>Batch Size</Label>
                  <span class="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {settings.serviceSpecificSettings.lorebookClassifier?.batchSize ?? 50}
                  </span>
                </div>
                <Slider
                  value={[settings.serviceSpecificSettings.lorebookClassifier?.batchSize ?? 50]}
                  min={10}
                  max={100}
                  step={10}
                  onValueChange={(v) => {
                    settings.serviceSpecificSettings.lorebookClassifier.batchSize = v[0];
                    settings.saveServiceSpecificSettings();
                  }}
                />
                <div class="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  <span>Reliable</span>
                  <span>Fast</span>
                </div>
              </div>

              <!-- Max Concurrent -->
              <div class="space-y-3">
                <div class="flex justify-between">
                  <Label>Max Concurrent Requests</Label>
                  <span class="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {settings.serviceSpecificSettings.lorebookClassifier?.maxConcurrent ?? 5}
                  </span>
                </div>
                <Slider
                  value={[settings.serviceSpecificSettings.lorebookClassifier?.maxConcurrent ?? 5]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(v) => {
                    settings.serviceSpecificSettings.lorebookClassifier.maxConcurrent = v[0];
                    settings.saveServiceSpecificSettings();
                  }}
                />
                <div class="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  <span>Sequential</span>
                  <span>Parallel</span>
                </div>
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Root>

      <!-- Lore Management Settings -->
      <Card.Root>
        <Collapsible.Root bind:open={showLoreManagementSection}>
          <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10">
                <BookOpen class="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <h3 class="font-medium leading-none">Lore Management</h3>
                <p class="text-xs text-muted-foreground mt-1">Autonomous agent iteration limits</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
               <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onclick={() => settings.resetLoreManagementSettings()}
                title="Reset to default"
              >
                <RotateCcw class="h-3.5 w-3.5" />
              </Button>
              <Collapsible.Trigger asChild let:builder>
                <Button builders={[builder]} variant="ghost" size="sm" class="h-8 w-8 p-0">
                  {#if showLoreManagementSection}
                    <ChevronDown class="h-4 w-4 rotate-180 transition-transform duration-200" />
                  {:else}
                    <ChevronDown class="h-4 w-4 transition-transform duration-200" />
                  {/if}
                  <span class="sr-only">Toggle</span>
                </Button>
              </Collapsible.Trigger>
            </div>
          </div>
          
          <Collapsible.Content>
            <div class="px-4 pb-4 pt-0 space-y-6">
              <Separator class="mb-4" />
              
              <!-- Max Iterations -->
              <div class="space-y-3">
                <div class="flex justify-between">
                  <Label>Max Iterations</Label>
                  <span class="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {settings.systemServicesSettings.loreManagement?.maxIterations ?? 50}
                  </span>
                </div>
                <Slider
                  value={[settings.systemServicesSettings.loreManagement?.maxIterations ?? 50]}
                  min={10}
                  max={100}
                  step={5}
                  onValueChange={(v) => {
                    settings.systemServicesSettings.loreManagement.maxIterations = v[0];
                    settings.saveSystemServicesSettings();
                  }}
                />
                <div class="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  <span>Conservative</span>
                  <span>Extensive</span>
                </div>
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Root>

      <!-- Classifier Settings -->
      <Card.Root>
        <Collapsible.Root bind:open={showClassifierSection}>
          <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10">
                <Brain class="h-4 w-4 text-cyan-500" />
              </div>
              <div>
                <h3 class="font-medium leading-none">World State Classifier</h3>
                <p class="text-xs text-muted-foreground mt-1">Context window management</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
               <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onclick={() => settings.resetClassifierSettings()}
                title="Reset to default"
              >
                <RotateCcw class="h-3.5 w-3.5" />
              </Button>
              <Collapsible.Trigger asChild let:builder>
                <Button builders={[builder]} variant="ghost" size="sm" class="h-8 w-8 p-0">
                  {#if showClassifierSection}
                    <ChevronDown class="h-4 w-4 rotate-180 transition-transform duration-200" />
                  {:else}
                    <ChevronDown class="h-4 w-4 transition-transform duration-200" />
                  {/if}
                  <span class="sr-only">Toggle</span>
                </Button>
              </Collapsible.Trigger>
            </div>
          </div>
          
          <Collapsible.Content>
            <div class="px-4 pb-4 pt-0 space-y-6">
              <Separator class="mb-4" />
              
              <!-- Chat History Truncation -->
              <div class="space-y-3">
                <div class="flex justify-between">
                  <Label>Chat History Truncation (Words)</Label>
                  <span class="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {settings.systemServicesSettings.classifier?.chatHistoryTruncation === 0 
                      ? 'No Limit' 
                      : settings.systemServicesSettings.classifier?.chatHistoryTruncation ?? 0}
                  </span>
                </div>
                <Slider
                  value={[settings.systemServicesSettings.classifier?.chatHistoryTruncation ?? 0]}
                  min={0}
                  max={500}
                  step={50}
                  onValueChange={(v) => {
                    settings.systemServicesSettings.classifier.chatHistoryTruncation = v[0];
                    settings.saveSystemServicesSettings();
                  }}
                />
                <div class="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  <span>Unlimited</span>
                  <span>500 Words</span>
                </div>
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Root>

      <!-- Entry Retrieval Settings -->
      <Card.Root>
        <Collapsible.Root bind:open={showEntryRetrievalSection}>
          <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10">
                <Search class="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h3 class="font-medium leading-none">Entry Retrieval</h3>
                <p class="text-xs text-muted-foreground mt-1">LLM-based selection settings</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
               <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onclick={() => settings.resetEntryRetrievalSettings()}
                title="Reset to default"
              >
                <RotateCcw class="h-3.5 w-3.5" />
              </Button>
              <Collapsible.Trigger asChild let:builder>
                <Button builders={[builder]} variant="ghost" size="sm" class="h-8 w-8 p-0">
                  {#if showEntryRetrievalSection}
                    <ChevronDown class="h-4 w-4 rotate-180 transition-transform duration-200" />
                  {:else}
                    <ChevronDown class="h-4 w-4 transition-transform duration-200" />
                  {/if}
                  <span class="sr-only">Toggle</span>
                </Button>
              </Collapsible.Trigger>
            </div>
          </div>
          
          <Collapsible.Content>
            <div class="px-4 pb-4 pt-0 space-y-6">
              <Separator class="mb-4" />
              
              <!-- Enable LLM Selection -->
              <div class="flex flex-row items-center justify-between">
                <div class="space-y-0.5">
                  <Label class="text-sm">Enable LLM Selection</Label>
                  <p class="text-xs text-muted-foreground">
                    Use LLM to intelligently select lorebook entries
                  </p>
                </div>
                <Switch
                  checked={settings.systemServicesSettings.entryRetrieval?.enableLLMSelection ?? true}
                  onCheckedChange={(v) => {
                    settings.systemServicesSettings.entryRetrieval.enableLLMSelection = v;
                    settings.saveSystemServicesSettings();
                  }}
                />
              </div>

              <!-- Max Tier 3 Entries -->
              <div class="space-y-3">
                <div class="flex justify-between">
                  <Label>Max Tier 3 Entries</Label>
                  <span class="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {settings.systemServicesSettings.entryRetrieval?.maxTier3Entries === 0 
                      ? 'Unlimited' 
                      : settings.systemServicesSettings.entryRetrieval?.maxTier3Entries ?? 0}
                  </span>
                </div>
                <Slider
                  value={[settings.systemServicesSettings.entryRetrieval?.maxTier3Entries ?? 0]}
                  min={0}
                  max={20}
                  step={1}
                  onValueChange={(v) => {
                    settings.systemServicesSettings.entryRetrieval.maxTier3Entries = v[0];
                    settings.saveSystemServicesSettings();
                  }}
                />
                <div class="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  <span>Unlimited</span>
                  <span>20 Entries</span>
                </div>
              </div>

              <!-- Max Words Per Entry -->
              <div class="space-y-3">
                <div class="flex justify-between">
                  <Label>Max Words Per Entry</Label>
                  <span class="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {settings.systemServicesSettings.entryRetrieval?.maxWordsPerEntry === 0 
                      ? 'Unlimited' 
                      : settings.systemServicesSettings.entryRetrieval?.maxWordsPerEntry ?? 0}
                  </span>
                </div>
                <Slider
                  value={[settings.systemServicesSettings.entryRetrieval?.maxWordsPerEntry ?? 0]}
                  min={0}
                  max={1000}
                  step={50}
                  onValueChange={(v) => {
                    settings.systemServicesSettings.entryRetrieval.maxWordsPerEntry = v[0];
                    settings.saveSystemServicesSettings();
                  }}
                />
                <div class="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  <span>Unlimited</span>
                  <span>1000 Words</span>
                </div>
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Root>
    </div>
  </div>

  <p class="text-xs text-center text-muted-foreground">
    Model configurations for all agents are managed in the Generation tab under Agent Profiles.
  </p>
</div>
