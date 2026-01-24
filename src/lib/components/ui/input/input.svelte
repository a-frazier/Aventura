<script lang="ts">
	import type {
		HTMLInputAttributes,
		HTMLInputTypeAttribute,
	} from "svelte/elements";
	import type { WithElementRef } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type InputType = Exclude<HTMLInputTypeAttribute, "file">;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, "type"> &
			(
				| { type: "file"; files?: FileList }
				| { type?: InputType; files?: undefined }
			)
	> & {
		leftIcon?: typeof import("lucide-svelte").Search;
		rightIcon?: typeof import("lucide-svelte").Search;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		leftIcon,
		rightIcon,
		...restProps
	}: Props = $props();
</script>

{#if type === "file"}
	<input
		bind:this={ref}
		class={cn(
			"border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring flex h-10 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
			className,
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<div class="relative flex w-full">
		{#if leftIcon}
			<div class="absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground">
				<svelte:component this={leftIcon} class="h-4 w-4" />
			</div>
		{/if}
		<input
			bind:this={ref}
			class={cn(
				"border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring flex h-10 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				leftIcon && "pl-10",
				rightIcon && "pr-10",
				leftIcon && rightIcon && "px-10",
				className,
			)}
			{type}
			bind:value
			{...restProps}
		/>
		{#if rightIcon}
			<div class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground">
				<svelte:component this={rightIcon} class="h-4 w-4" />
			</div>
		{/if}
	</div>
{/if}
