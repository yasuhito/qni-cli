# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../lib/qni/angle_expression'

module Qni
  class AngleExpressionTest < Minitest::Test
    def test_normalizes_theta_shorthand_with_numeric_coefficient
      angle = AngleExpression.new('2θ')

      assert_equal '2*theta', angle.to_s
    end

    def test_resolves_theta_shorthand_against_variables
      angle = AngleExpression.new('2θ')

      assert_in_delta Math::PI / 2, angle.radians('theta' => 'π/4')
    end
  end
end
