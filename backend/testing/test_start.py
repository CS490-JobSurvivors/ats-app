def someTestFunction(value):
    return f"This Response{value}"

def test_sampleTestOne():
    assert 1 == 1

def test_sampleTestTwo():
    parameter = "Mock Value"
    assert someTestFunction(parameter) == "This ResponseMock Value"

def test_sampleTestThree():
    parameter = ""
    assert someTestFunction(parameter) == "This Response"

