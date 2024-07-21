import { useState, useEffect } from "react";
import cheerio from "cheerio";

const App = () => {
  const search = new URLSearchParams(window.location.search);

  const [ref, setRef] = useState(search.get('start'))
  const [processed, setProcessed] = useState(0)
  const [failed, setFailed] = useState(0)
  const [data, setData] = useState([])

  function getNextRef(currentRef) {
    let lastRef = search.get('end')

    if (
      typeof currentRef !== 'string' || currentRef.length !== 14
      || typeof lastRef !== 'string' || lastRef.length !== 14
    ) return false

    let currentNumber = parseInt(currentRef, 10)
    let lastNumber = parseInt(lastRef, 10)

    if (currentNumber > lastNumber) return false

    return (currentNumber + 1).toString().padStart(14, '0')
  }

  function ucWords(str) {
    return str.toLowerCase().replace(/\b([a-zA-Z])/g, function (match) {
      return match.toUpperCase();
    });
  }

  useEffect(() => {
    const scrap = async () => {
      try {
        const response = await fetch(`https://bill.pitc.com.pk/gepcobill/general?refno=${ref}`)
        const html = await response.text()

        const $ = cheerio.load(html)

        if ($('b:contains("PAYABLE WITHIN DUE DATE")').length == 0) throw new Error('Bill not found.')

        let $billCalculationsContainer = $('h3:contains("BILL CALCULATION")').closest('tbody').find('tr.border-b')
        let billCalculations = null;

        if ($billCalculationsContainer.length > 0) {
          billCalculations = $billCalculationsContainer.find('tr.content').first().find('td').text().trim()
        }

        let newData = {
          month: $($('h4:contains("BILL MONTH")').first().closest('tbody').find('tr.content').find('td')[3]).text().trim(),
          nameAndAddress: ucWords($('span:contains("NAME & ADDRESS")').closest('td').text().replace('NAME & ADDRESS', '').replace(/\s\s+/g, ' ').trim()),
          division: $('h4:contains("DIVISION")').first().closest('td').siblings('td.content').text().trim(),
          subDivision: $('h4:contains("SUB DIVISION")').first().closest('td').siblings('td.content').text().trim(),
          bill: $('b:contains("PAYABLE WITHIN DUE DATE")').closest('td').siblings('td.content').text().trim(),
          units: $('b:contains("UNITS CONSUMED")').closest('td').siblings('td.content').first().text().trim(),
          billCalculations: billCalculations,
        }

        setData((prevData) => [...prevData, newData])

        setProcessed((prevProcessed) => ++prevProcessed)
      } catch (error) {
        console.log(error)
        setFailed((prevFailed) => ++prevFailed)
      } finally {
        setRef((prevRef) => getNextRef(prevRef))
      }
    }

    if (getNextRef(ref)) scrap()
  }, [ref])

  return (
    <>
      <p>Processed: {processed}</p>
      <p>Failed: {failed}</p>
      {
        data.length > 0
          ? <pre>{JSON.stringify(data, null, 2)}</pre>
          : <p>Loading...</p>
      }
    </>
  )
}

export default App