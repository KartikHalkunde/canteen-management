package com.canteen.canteen_management.controller;

import com.canteen.canteen_management.dto.CartItemDto;
import com.canteen.canteen_management.entity.User;
import com.canteen.canteen_management.repository.UserRepository;
import com.canteen.canteen_management.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/user/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final UserRepository userRepository;

    private Long getUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"))
                .getId();
    }

    @GetMapping
    public ResponseEntity<List<CartItemDto>> getCart(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(cartService.getCart(getUserId(userDetails)));
    }

    @PostMapping("/add")
    public ResponseEntity<List<CartItemDto>> addToCart(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CartItemDto dto) {
        return ResponseEntity.ok(cartService.addToCart(getUserId(userDetails), dto));
    }

    @PutMapping("/update/{menuItemId}")
    public ResponseEntity<List<CartItemDto>> updateItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long menuItemId,
            @RequestParam Integer quantity) {
        return ResponseEntity.ok(cartService.updateCartItem(
                getUserId(userDetails), menuItemId, quantity));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearCart(
            @AuthenticationPrincipal UserDetails userDetails) {
        cartService.clearCart(getUserId(userDetails));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/total")
    public ResponseEntity<BigDecimal> getTotal(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(cartService.getCartTotal(getUserId(userDetails)));
    }
}