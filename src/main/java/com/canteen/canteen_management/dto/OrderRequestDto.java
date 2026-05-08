package com.canteen.canteen_management.dto;

import com.canteen.canteen_management.entity.Order;
import lombok.Data;

@Data
public class OrderRequestDto {
    private Order.PaymentMethod paymentMethod;
    private String notes;
}