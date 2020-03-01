const { Notabase } = require('../dist/notabase')

// node env
let nb = new Notabase()

test('collection', async () => {
  let testTable1Url = "https://www.notion.so/0a4155a50f6943e0bda2b6105cd41541?v=fe0a5e52a9ae4e1593e18307f98588a6"
  let testTable2Url = "https://www.notion.so/20fc1b38973a452cbfd4944b10279d03?v=9de3852a009f4e0199c4d2c48b459131"

  let db = await nb.fetchAll({
    test1: testTable1Url,
    test2: testTable2Url
  })
  let testTable1 = db.test1
  // let testTable2 = db.test2
  expect(testTable1.rows.length).toBeGreaterThanOrEqual(3);
  let { Name, Text, Select, MultiSelect, Files, date, Person, Checkbox, Url, Email, Phone, Relation } = testTable1.rows[0]

  //String
  expect(Name).toMatch('name')
  expect(Text).toMatch('text')
  expect(Select).toMatch('s1')
  expect(Email).toMatch('test@gmail.com')
  expect(Phone).toMatch('+8613812341234')
  expect(Url).toMatch(/^https:\/\//)

  // Array
  expect(MultiSelect).toContain('tag1')
  expect(Files).toContain('https://s3-us-west-2.amazonaws.com/secure.notion-static.com/52fd8e51-0437-4082-ab5a-cf37edfc62de/hdImg_831f254ff0e73bacd6bc66ff0b665a5015447132841.jpg')

  // Boolean
  expect(Checkbox).toBe(true)

  // advanced
  expect(Person).toContain('62931804-ac73-4fb9-9a80-9075f7f0020a')
  // fixme
  // expect(date.startDate.toISOString()).toBe('2019-10-03T00:00:00.000Z')  
  expect(Relation[0].Name).toBe("table2 row1")

}, 10000)



test('collection over 1000 records', async () => {
  let testTable1Url = "https://www.notion.so/c9e0e4c92c864ca2a4d3550cffe442f9?v=2424ba0a32bd4a8790bd1d0b74f78fcb"
  let db = await nb.fetch(testTable1Url);
  expect(db.rows.length).toBe(1278);
  expect(db.total).toBe(1278);
}, 10000)