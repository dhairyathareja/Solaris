from load_profile import compute_self_consumption


def test_ratio_sum_is_one():
    for category in ['domestic', 'commercial', 'industrial']:
        data = compute_self_consumption(category)
        total = round(data['self_consumption_ratio'] + data['export_ratio'], 6)
        assert total == 1.0
        assert 0.0 <= data['self_consumption_ratio'] <= 1.0
        assert 0.0 <= data['export_ratio'] <= 1.0


def test_expected_ordering():
    domestic = compute_self_consumption('domestic')['self_consumption_ratio']
    commercial = compute_self_consumption('commercial')['self_consumption_ratio']
    industrial = compute_self_consumption('industrial')['self_consumption_ratio']

    assert commercial > industrial > domestic
