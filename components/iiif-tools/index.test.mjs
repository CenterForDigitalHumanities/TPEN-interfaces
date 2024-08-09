import {encodeContentState, decodeContentState} from './index.mjs'

function test_encodeContentState() {

    // Test case 1: Normal case with plain text
    let plainContentState1 = "Hello World"
    console.assert(encodeContentState(plainContentState1) === "SGVsbG8lMjBXb3JsZA", `Test case 1 failed: ${encodeContentState(plainContentState1)}`)

    // Test case 2: Empty string
    let plainContentState2 = ""
    console.assert(encodeContentState(plainContentState2) === "", `Test case 2 failed: ${encodeContentState(plainContentState2)}`)

    // Test case 3: Case with numbers
    let plainContentState3 = "1234567890"
    console.assert(encodeContentState(plainContentState3) === "MTIzNDU2Nzg5MA", `Test case 3 failed: ${encodeContentState(plainContentState3)}`)

    // Test case 4: Case with special characters
    let plainContentState4 = "!@#$%^&*()"
    console.assert(encodeContentState(plainContentState4) === "ISU0MCUyMyUyNCUyNSU1RSUyNiooKQ", `Test case 4 failed: ${encodeContentState(plainContentState4)}`)

    // Test case 5: Case with spaces
    let plainContentState5 = "Hello World"
    console.assert(encodeContentState(plainContentState5) === "SGVsbG8lMjBXb3JsZA", `Test case 5 failed: ${encodeContentState(plainContentState5)}`)

    // Test case 6: Case with a stringified JSON object
    let plainContentState6 = '{"title":"Lorem Ipsum 441", "body":"textual content", "target":"https://example.com/canvas/4#xywh=1,12,50,20"}'
    console.assert(encodeContentState(plainContentState6) === "JTdCJTIydGl0bGUlMjIlM0ElMjJMb3JlbSUyMElwc3VtJTIwNDQxJTIyJTJDJTIwJTIyYm9keSUyMiUzQSUyMnRleHR1YWwlMjBjb250ZW50JTIyJTJDJTIwJTIydGFyZ2V0JTIyJTNBJTIyaHR0cHMlM0ElMkYlMkZleGFtcGxlLmNvbSUyRmNhbnZhcyUyRjQlMjN4eXdoJTNEMSUyQzEyJTJDNTAlMkMyMCUyMiU3RA", `Test case 6 failed: ${encodeContentState(plainContentState6)}`)
}

test_encodeContentState()

function test_decodeContentState() {
    // Test case 1: Normal case with encoded text
    let encodedContentState1 = "SGVsbG8lMjBXb3JsZA"
    console.assert(decodeContentState(encodedContentState1) === "Hello World", `Test case 1 failed: ${decodeContentState(encodedContentState1)}`)

    // Test case 2: Empty string
    let encodedContentState2 = ""
    console.assert(decodeContentState(encodedContentState2) === "", `Test case 2 failed: ${decodeContentState(encodedContentState2)}`)

    // Test case 3: Case with numbers
    let encodedContentState3 = "MTIzNDU2Nzg5MA"
    console.assert(decodeContentState(encodedContentState3) === "1234567890", `Test case 3 failed: ${decodeContentState(encodedContentState3)}`)

    // Test case 4: Case with special characters
    let encodedContentState4 = "ISU0MCUyMyUyNCUyNSU1RSUyNiooKQ"
    console.assert(decodeContentState(encodedContentState4) === "!@#$%^&*()", `Test case 4 failed: ${decodeContentState(encodedContentState4)}`)

    // Test case 5: Case with spaces
    let encodedContentState5 = "SGVsbG8lMjBXb3JsZA"
    console.assert(decodeContentState(encodedContentState5) === "Hello World", `Test case 5 failed: ${decodeContentState(encodedContentState5)}`)

    // Test case 6: Case with a stringified JSON object
    let encodeContentState6 = "JTdCJTIydGl0bGUlMjIlM0ElMjJMb3JlbSUyMElwc3VtJTIwNDQxJTIyJTJDJTIwJTIyYm9keSUyMiUzQSUyMnRleHR1YWwlMjBjb250ZW50JTIyJTJDJTIwJTIydGFyZ2V0JTIyJTNBJTIyaHR0cHMlM0ElMkYlMkZleGFtcGxlLmNvbSUyRmNhbnZhcyUyRjQlMjN4eXdoJTNEMSUyQzEyJTJDNTAlMkMyMCUyMiU3RA"
    console.assert(decodeContentState(encodeContentState6) === '{"title":"Lorem Ipsum 441", "body":"textual content", "target":"https://example.com/canvas/4#xywh=1,12,50,20"}', `Test case 6 failed: ${decodeContentState(encodeContentState6)}`)
}

test_decodeContentState()

function test_integrated_utils() {
    // Test case 1: Object encoded and decoded matches the original
    let plainContentState1 = '{"title":"Lorem Ipsum 441", "body":"textual content", "target":"https://example.com/canvas/4#xywh=1,12,50,20"}'
    let encodedContentState1 = encodeContentState(plainContentState1)
    let decodedContentState1 = decodeContentState(encodedContentState1)
    console.assert(decodedContentState1 === plainContentState1, `Test case 1 failed: ${decodedContentState1}`)
}

test_integrated_utils()