<script lang="ts">
  import { onMount } from "svelte";

  // Report cards data
  const reports = [
    {
      title: "Hourly Stats Report",
      description:
        "Analyze glucose patterns by hour of day with box plots and IOB data",
      icon: "📊",
      href: "/reports/hourly-stats",
      features: [
        "24-hour glucose distribution",
        "Box plot visualizations",
        "IOB tracking",
        "Statistical analysis",
      ],
      status: "available",
    },
    {
      title: "Treatments Report",
      description:
        "View, edit, and manage all treatment entries with comprehensive filtering",
      icon: "💉",
      href: "/reports/treatments",
      features: [
        "Full treatment history",
        "Edit/delete functionality",
        "Advanced filtering",
        "Export capabilities",
      ],
      status: "available",
    },
    {
      title: "Daily Stats Report",
      description: "Day-by-day glucose statistics and trends analysis",
      icon: "📈",
      href: "/reports/daily-stats",
      features: [
        "Daily averages",
        "Time in range",
        "Standard deviation",
        "Trend analysis",
      ],
      status: "coming-soon",
    },
    {
      title: "Day-to-Day Report",
      description: "Compare glucose patterns across multiple days",
      icon: "📅",
      href: "/reports/day-to-day",
      features: [
        "Pattern overlay",
        "Day comparison",
        "Variability analysis",
        "Weekly patterns",
      ],
      status: "coming-soon",
    },
    {
      title: "Distribution Report",
      description:
        "Glucose distribution analysis with histograms and percentiles",
      icon: "📊",
      href: "/reports/distribution",
      features: [
        "Histogram analysis",
        "Percentile calculations",
        "Normal range analysis",
        "Distribution curves",
      ],
      status: "coming-soon",
    },
    {
      title: "Calibrations Report",
      description: "Sensor calibration history and accuracy analysis",
      icon: "🎯",
      href: "/reports/calibrations",
      features: [
        "Calibration tracking",
        "Accuracy metrics",
        "Sensor performance",
        "Trend analysis",
      ],
      status: "coming-soon",
    },
  ];

  // Quick stats (placeholder data)
  let quickStats = {
    totalTreatments: 0,
    totalReadings: 0,
    timeInRange: 0,
    averageGlucose: 0,
    lastUpdate: new Date(),
  };

  onMount(() => {
    // In a real implementation, these would be fetched from the API
    quickStats = {
      totalTreatments: 1247,
      totalReadings: 8643,
      timeInRange: 78.2,
      averageGlucose: 142,
      lastUpdate: new Date(),
    };
  });
</script>

<svelte:head>
  <title>Reports - Nightscout</title>
  <meta
    name="description"
    content="Nightscout reports and analytics dashboard"
  />
</svelte:head>

<div class="container mx-auto px-4 py-6 space-y-8">
  <!-- Header -->
  <div class="text-center space-y-4">
    <h1 class="text-4xl font-bold">Reports & Analytics</h1>
    <p class="text-muted-foreground text-lg max-w-2xl mx-auto">
      Comprehensive analysis and insights from your Nightscout data. Choose from
      various reports to understand your glucose patterns and treatment
      effectiveness.
    </p>
  </div>

  <!-- Quick Stats -->
  <div class="bg-card border border-border rounded-lg p-6">
    <h2 class="text-xl font-semibold mb-4">Quick Overview</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="text-center">
        <div class="text-3xl font-bold text-primary">
          {quickStats.totalTreatments.toLocaleString()}
        </div>
        <div class="text-sm text-muted-foreground">Total Treatments</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-blue-600">
          {quickStats.totalReadings.toLocaleString()}
        </div>
        <div class="text-sm text-muted-foreground">Total Readings</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-green-600">
          {quickStats.timeInRange}%
        </div>
        <div class="text-sm text-muted-foreground">Time in Range</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-purple-600">
          {quickStats.averageGlucose}
        </div>
        <div class="text-sm text-muted-foreground">Avg Glucose (mg/dL)</div>
      </div>
    </div>
    <div class="text-xs text-muted-foreground text-center mt-4">
      Last updated: {quickStats.lastUpdate.toLocaleString()}
    </div>
  </div>

  <!-- Reports Grid -->
  <div class="space-y-6">
    <h2 class="text-2xl font-semibold">Available Reports</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each reports as report}
        <div
          class="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
        >
          <!-- Report Header -->
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="text-4xl">{report.icon}</div>
              {#if report.status === "available"}
                <span
                  class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200"
                >
                  Available
                </span>
              {:else}
                <span
                  class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-200"
                >
                  Coming Soon
                </span>
              {/if}
            </div>

            <h3 class="text-lg font-semibold mb-2">{report.title}</h3>
            <p class="text-muted-foreground text-sm mb-4">
              {report.description}
            </p>

            <!-- Features List -->
            <ul class="space-y-1 text-sm text-muted-foreground">
              {#each report.features as feature}
                <li class="flex items-center gap-2">
                  <span class="text-green-500">✓</span>
                  {feature}
                </li>
              {/each}
            </ul>
          </div>

          <!-- Action Button -->
          <div class="px-6 pb-6">
            {#if report.status === "available"}
              <a
                href={report.href}
                class="block w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center font-medium"
              >
                View Report
              </a>
            {:else}
              <button
                disabled
                class="block w-full bg-muted text-muted-foreground py-2 px-4 rounded-lg cursor-not-allowed text-center font-medium"
              >
                Coming Soon
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="bg-card border border-border rounded-lg p-6">
    <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
    <div class="flex flex-wrap gap-3">
      <a
        href="/reports/hourly-stats"
        class="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm"
      >
        📊 View Hourly Patterns
      </a>
      <a
        href="/reports/treatments"
        class="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors text-sm"
      >
        💉 Manage Treatments
      </a>
      <a
        href="/"
        class="bg-muted text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors text-sm"
      >
        🏠 Back to Dashboard
      </a>
    </div>
  </div>

  <!-- Help Section -->
  <div class="bg-muted/50 border border-border rounded-lg p-6">
    <h2 class="text-xl font-semibold mb-3">📚 Getting Started</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      <div>
        <h3 class="font-semibold mb-2">Understanding Your Data</h3>
        <ul class="space-y-1 text-muted-foreground">
          <li>• Review your glucose patterns in the Hourly Stats report</li>
          <li>• Track treatment effectiveness in the Treatments report</li>
          <li>• Look for trends and patterns across different time periods</li>
        </ul>
      </div>
      <div>
        <h3 class="font-semibold mb-2">Tips for Better Analysis</h3>
        <ul class="space-y-1 text-muted-foreground">
          <li>• Use date ranges to focus on specific periods</li>
          <li>• Filter data to isolate specific patterns</li>
          <li>• Export data for detailed analysis in other tools</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
  }

  /* Improve card hover effects */
  .bg-card:hover {
    transform: translateY(-2px);
    transition: transform 0.2s ease-in-out;
  }

  /* Grid responsive adjustments */
  @media (max-width: 768px) {
    .grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .grid-cols-2 {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
  }
</style>
