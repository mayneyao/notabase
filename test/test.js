const Notabase = require('../src/notabase')

// node env
let nb = new Notabase()

test('collection', async () => {
    let testTable = await nb.fetch("https://www.notion.so/0a4155a50f6943e0bda2b6105cd41541?v=fe0a5e52a9ae4e1593e18307f98588a6")
    expect(testTable.rows.length).toBeGreaterThanOrEqual(3);
    let { Name, Text, MultiSelect, Files, date, Person, Checkbox, Url } = testTable.rows[0]
    expect(Name).toMatch('name')
    expect(Text).toMatch('text')
    expect(MultiSelect).toContain('tag1')
    expect(Files).toContain('https://s3-us-west-2.amazonaws.com/secure.notion-static.com/52fd8e51-0437-4082-ab5a-cf37edfc62de/hdImg_831f254ff0e73bacd6bc66ff0b665a5015447132841.jpg')
    expect(date.startDate.toISOString()).toBe('2019-10-03T00:00:00.000Z')
    expect(Person).toContain('62931804-ac73-4fb9-9a80-9075f7f0020a')
    expect(Checkbox).toBe(true)
    expect(Url).toMatch(/^https:\/\//)
}, 10000)