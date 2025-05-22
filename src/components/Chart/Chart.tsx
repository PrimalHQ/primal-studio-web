import { Component, onMount } from 'solid-js'
import { Chart, Tooltip, Colors } from 'chart.js'
import { Bar } from 'solid-chartjs'
import { StudioGraph } from 'src/primal_api/studio'
import { shortDate } from 'src/utils/date'
import { GraphSpan } from 'src/pages/Home/Home.data'

const StudioChart: Component<{
  data: StudioGraph[],
  key: keyof StudioGraph
  span: GraphSpan,
}> = (props) => {

  onMount(() => {
    Chart.register(Tooltip, Colors)
  });

  const chartData = () => {
    const dataStore = props.data.reduce<Record<string, number[]>>((acc, datum) => {
      const {
        bookmarks,
        mentions,
        quotes,
        reactions,
        replies,
        reposts,
        satszapped_received,
        satszapped_sent,
        zaps_received,
        zaps_sent,
        score,
        t,
      } = datum;

      return {
        bookmarks: [ ...acc.bookmarks, bookmarks],
        mentions: [ ...acc.mentions, mentions],
        quotes: [ ...acc.quotes, quotes],
        reactions: [ ...acc.reactions, reactions],
        replies: [ ...acc.replies, replies],
        reposts: [ ...acc.reposts, reposts],
        satszapped_received: [ ...acc.satszapped_received, satszapped_received],
        satszapped_sent: [ ...acc.satszapped_sent, satszapped_sent],
        zaps_received: [ ...acc.zaps_received, zaps_received],
        zaps_sent: [ ...acc.zaps_sent, zaps_sent],
        score: [ ...acc.score, score],
        t: [ ...acc.t, t],
      }

    }, {
      bookmarks: [],
      mentions: [],
      quotes: [],
      reactions: [],
      replies: [],
      reposts: [],
      satszapped_received: [],
      satszapped_sent: [],
      zaps_received: [],
      zaps_sent: [],
      score: [],
      t: [],
    })

    const keys = [props.key];

    return {
      labels: (dataStore.t || []).map(ts => `${shortDate(ts)}`),
      datasets: keys.map(key => ({
        label: key,
        data: dataStore[key],
        backgroundColor: '#E47C00',
      }))
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
        }
      }
    },
  }

  return (
    <Bar data={chartData()} options={chartOptions} width={516} height={172} />
  )
}

export default StudioChart;
